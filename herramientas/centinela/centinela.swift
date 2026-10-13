// centinela — captura de cámara + filtro de rostro con Vision.
// Todo corre local: ninguna imagen ni huella sale de esta máquina.
//
//   centinela camaras                      lista las cámaras utilizables
//   centinela capturar <salida.jpg> [cam]  captura un fotograma
//   centinela enrolar  <dir_fotos>         construye la huella de la dueña
//   centinela comparar <imagen.jpg>        compara contra la referencia -> JSON

import Foundation
import AVFoundation
import Vision
import CoreImage

let baseDir = FileManager.default.homeDirectoryForCurrentUser
    .appendingPathComponent(".config/centinela")
let archivoRef = baseDir.appendingPathComponent("referencias/huellas.archive")
let archivoUmbral = baseDir.appendingPathComponent("referencias/umbral.txt")

let UMBRAL_POR_DEFECTO: Float = 18.0

// ───────────────────────────── utilidades ─────────────────────────────

func emitir(_ dict: [String: Any], codigo: Int32 = 0) -> Never {
    let data = try! JSONSerialization.data(withJSONObject: dict, options: [.sortedKeys])
    print(String(data: data, encoding: .utf8)!)
    exit(codigo)
}

func fallar(_ mensaje: String) -> Never {
    emitir(["ok": false, "error": mensaje], codigo: 1)
}

// Cámaras utilizables: internas y USB externas. Se excluye la de Continuidad
// a propósito, para no despertar el iPhone en cada verificación.
func camarasDisponibles() -> [AVCaptureDevice] {
    let ds = AVCaptureDevice.DiscoverySession(
        deviceTypes: [.external, .builtInWideAngleCamera],
        mediaType: .video,
        position: .unspecified)
    return ds.devices.filter { !$0.localizedName.lowercased().contains("iphone") }
}

func elegirCamara(preferida: String?) -> AVCaptureDevice? {
    let disp = camarasDisponibles()
    if let p = preferida, !p.isEmpty {
        if let c = disp.first(where: { $0.localizedName.lowercased().contains(p.lowercased()) }) {
            return c
        }
    }
    // Sin preferencia: la externa primero. En dock con la tapa cerrada la
    // cámara interna no sirve de nada.
    if let externa = disp.first(where: { $0.deviceType == .external }) { return externa }
    return disp.first
}

// ───────────────────────────── captura ─────────────────────────────

// Se usa AVCaptureVideoDataOutput y no AVCapturePhotoOutput: el segundo
// depende de KVO que no se enlaza en binarios sin bundle de app.
final class Capturador: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    private let sesion = AVCaptureSession()
    private let salida = AVCaptureVideoDataOutput()
    private let cola = DispatchQueue(label: "io.ejemplo.centinela.captura")
    private let sem = DispatchSemaphore(value: 0)
    private let ctx = CIContext()

    private var jpeg: Data?
    private var cuadros = 0
    // La exposición automática necesita varios cuadros para estabilizarse;
    // tomar el primero da una imagen negra o quemada.
    private let cuadrosDeCalentamiento = 14

    func capturar(camara: AVCaptureDevice) -> (Data?, String?) {
        sesion.beginConfiguration()
        sesion.sessionPreset = .photo
        do {
            let entrada = try AVCaptureDeviceInput(device: camara)
            guard sesion.canAddInput(entrada) else {
                sesion.commitConfiguration()
                return (nil, "no se pudo agregar la entrada de video")
            }
            sesion.addInput(entrada)
        } catch {
            sesion.commitConfiguration()
            return (nil, "no se pudo abrir la cámara: \(error.localizedDescription)")
        }

        salida.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        salida.alwaysDiscardsLateVideoFrames = true
        salida.setSampleBufferDelegate(self, queue: cola)
        guard sesion.canAddOutput(salida) else {
            sesion.commitConfiguration()
            return (nil, "no se pudo agregar la salida de video")
        }
        sesion.addOutput(salida)
        sesion.commitConfiguration()

        sesion.startRunning()
        let resultado = sem.wait(timeout: .now() + 15)
        sesion.stopRunning()

        if resultado == .timedOut {
            return (nil, cuadros == 0
                ? "la cámara no entregó ningún cuadro (¿permiso de cámara denegado?)"
                : "se agotó el tiempo al codificar la imagen")
        }
        return (jpeg, jpeg == nil ? "no se pudo codificar el cuadro" : nil)
    }

    func captureOutput(_ output: AVCaptureOutput,
                       didOutput sampleBuffer: CMSampleBuffer,
                       from connection: AVCaptureConnection) {
        guard jpeg == nil else { return }
        cuadros += 1
        guard cuadros >= cuadrosDeCalentamiento else { return }
        guard let pb = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        let imagen = CIImage(cvPixelBuffer: pb)
        let espacio = imagen.colorSpace ?? CGColorSpace(name: CGColorSpace.sRGB)!
        jpeg = ctx.jpegRepresentation(of: imagen, colorSpace: espacio,
                                      options: [:])
        sem.signal()
    }
}

// ───────────────────────────── rostros ─────────────────────────────

struct Rostro {
    let huella: VNFeaturePrintObservation
    let area: Float
}

/// Detecta rostros y devuelve la huella visual de cada uno, del más grande al
/// más chico. El más grande es casi siempre quien está sentado al teclado.
func analizarRostros(en url: URL) throws -> [Rostro] {
    guard let fuente = CGImageSourceCreateWithURL(url as CFURL, nil),
          let cg = CGImageSourceCreateImageAtIndex(fuente, 0, nil) else {
        throw NSError(domain: "centinela", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "no se pudo leer la imagen"])
    }

    let manejador = VNImageRequestHandler(cgImage: cg, options: [:])
    let detectar = VNDetectFaceRectanglesRequest()
    try manejador.perform([detectar])
    guard let caras = detectar.results, !caras.isEmpty else { return [] }

    var salida: [Rostro] = []
    for cara in caras {
        // Se expande la caja: la huella visual es más estable con algo de
        // contexto (frente, mentón, pelo) que con el rostro recortado al ras.
        let c = cara.boundingBox
        let m: CGFloat = 0.22
        let x = max(0, c.minX - c.width * m)
        let y = max(0, c.minY - c.height * m)
        let roi = CGRect(x: x, y: y,
                         width: min(1 - x, c.width * (1 + 2 * m)),
                         height: min(1 - y, c.height * (1 + 2 * m)))

        let req = VNGenerateImageFeaturePrintRequest()
        req.regionOfInterest = roi
        req.imageCropAndScaleOption = .scaleFill
        try manejador.perform([req])

        if let h = req.results?.first {
            salida.append(Rostro(huella: h, area: Float(c.width * c.height)))
        }
    }
    return salida.sorted { $0.area > $1.area }
}

func cargarReferencias() -> [VNFeaturePrintObservation] {
    guard let data = try? Data(contentsOf: archivoRef) else { return [] }
    let arr = try? NSKeyedUnarchiver.unarchivedArrayOfObjects(
        ofClass: VNFeaturePrintObservation.self, from: data)
    return arr ?? []
}

func umbralActual() -> Float {
    guard let s = try? String(contentsOf: archivoUmbral, encoding: .utf8),
          let v = Float(s.trimmingCharacters(in: .whitespacesAndNewlines)) else {
        return UMBRAL_POR_DEFECTO
    }
    return v
}

func distanciaMinima(_ h: VNFeaturePrintObservation,
                     _ refs: [VNFeaturePrintObservation]) -> Float? {
    var mejor: Float?
    for r in refs {
        var d = Float(0)
        guard (try? h.computeDistance(&d, to: r)) != nil else { continue }
        if mejor == nil || d < mejor! { mejor = d }
    }
    return mejor
}

// ───────────────────────────── comandos ─────────────────────────────

let args = CommandLine.arguments
guard args.count >= 2 else {
    FileHandle.standardError.write(
        "uso: centinela {camaras|capturar|enrolar|comparar} ...\n".data(using: .utf8)!)
    exit(2)
}

switch args[1] {

case "camaras":
    let lista = camarasDisponibles().map { c -> [String: String] in
        ["nombre": c.localizedName,
         "tipo": c.deviceType == .external ? "externa" : "interna"]
    }
    emitir(["ok": true, "camaras": lista])

case "capturar":
    guard args.count >= 3 else { fallar("falta la ruta de salida") }
    let destino = URL(fileURLWithPath: args[2])
    let preferida = args.count >= 4 ? args[3] : nil
    guard let cam = elegirCamara(preferida: preferida) else {
        fallar("no se encontró ninguna cámara utilizable")
    }
    let (datos, err) = Capturador().capturar(camara: cam)
    guard let d = datos else { fallar(err ?? "la captura vino vacía") }
    do { try d.write(to: destino) } catch { fallar("no se pudo guardar: \(error.localizedDescription)") }
    emitir(["ok": true, "camara": cam.localizedName,
            "archivo": destino.path, "bytes": d.count])

case "enrolar":
    guard args.count >= 3 else { fallar("falta el directorio con tus fotos") }
    let dir = URL(fileURLWithPath: args[2])
    let fm = FileManager.default
    guard let archivos = try? fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) else {
        fallar("no se pudo leer el directorio \(dir.path)")
    }
    let fotos = archivos.filter { ["jpg","jpeg","png","heic"].contains($0.pathExtension.lowercased()) }
    guard !fotos.isEmpty else { fallar("no hay fotos en \(dir.path)") }

    var huellas: [VNFeaturePrintObservation] = []
    var usadas: [String] = []
    var ignoradas: [String] = []
    for f in fotos.sorted(by: { $0.lastPathComponent < $1.lastPathComponent }) {
        guard let rostros = try? analizarRostros(en: f), let primero = rostros.first else {
            ignoradas.append(f.lastPathComponent + " (sin rostro detectable)")
            continue
        }
        huellas.append(primero.huella)
        usadas.append(f.lastPathComponent)
    }
    guard huellas.count >= 2 else {
        fallar("se necesitan al menos 2 fotos con rostro detectable; solo sirvieron \(huellas.count)")
    }

    // Umbral automático: la mayor distancia entre dos fotos de la MISMA persona
    // marca cuánto varía ella entre tomas. Se deja holgura sobre ese máximo.
    var intra: [Float] = []
    for i in 0..<huellas.count {
        for j in (i+1)..<huellas.count {
            var d = Float(0)
            if (try? huellas[i].computeDistance(&d, to: huellas[j])) != nil { intra.append(d) }
        }
    }
    let maxIntra = intra.max() ?? UMBRAL_POR_DEFECTO
    let promIntra = intra.isEmpty ? 0 : intra.reduce(0,+) / Float(intra.count)
    let umbral = maxIntra * 1.18

    do {
        let data = try NSKeyedArchiver.archivedData(withRootObject: huellas,
                                                    requiringSecureCoding: true)
        try data.write(to: archivoRef)
        try String(format: "%.4f", umbral).write(to: archivoUmbral,
                                                  atomically: true, encoding: .utf8)
    } catch {
        fallar("no se pudo guardar la referencia: \(error.localizedDescription)")
    }

    emitir(["ok": true, "fotos_usadas": usadas, "fotos_ignoradas": ignoradas,
            "distancia_entre_tus_fotos_max": maxIntra,
            "distancia_entre_tus_fotos_prom": promIntra,
            "umbral_calculado": umbral])

case "comparar":
    guard args.count >= 3 else { fallar("falta la imagen a comparar") }
    let img = URL(fileURLWithPath: args[2])
    // Se analiza ANTES de revisar la referencia, para que el conteo de rostros
    // sea útil incluso sin enrolamiento (sirve para calibrar la cámara).
    guard let rostros = try? analizarRostros(en: img) else {
        fallar("no se pudo analizar la imagen")
    }
    let refs = cargarReferencias()
    guard !refs.isEmpty else {
        emitir(["ok": true, "veredicto": "sin_referencia",
                "rostros": rostros.count,
                "nota": "corre primero: centinela enrolar"])
    }
    guard let principal = rostros.first else {
        emitir(["ok": true, "veredicto": "sin_rostro", "rostros": 0,
                "umbral": umbralActual()])
    }
    guard let d = distanciaMinima(principal.huella, refs) else {
        fallar("no se pudo calcular la distancia")
    }
    let u = umbralActual()
    emitir(["ok": true,
            "veredicto": d <= u ? "duena" : "desconocido",
            "rostros": rostros.count,
            "distancia": d,
            "umbral": u,
            "area_rostro": principal.area])

default:
    fallar("subcomando desconocido: \(args[1])")
}
