#!/usr/bin/env python3
"""Imprime el RSSI del dispositivo Bluetooth con la MAC dada, o 'ausente'.

Se identifica por MAC y no por nombre porque macOS escribe los nombres de los
dispositivos Apple con un espacio no-rompible (Apple\xa0Watch) y cualquier
comparación por texto falla en silencio.
"""
import json
import subprocess
import sys


def dispositivos():
    try:
        crudo = subprocess.run(
            ["system_profiler", "SPBluetoothDataType", "-json"],
            capture_output=True, text=True, timeout=25).stdout
    except Exception:
        return []
    if not crudo.strip():
        return []
    try:
        datos = json.loads(crudo)
    except Exception:
        return []

    encontrados = []

    def recorrer(nodo):
        if isinstance(nodo, dict):
            for valor in nodo.values():
                if isinstance(valor, dict) and "device_address" in valor:
                    encontrados.append(valor)
                recorrer(valor)
        elif isinstance(nodo, list):
            for elemento in nodo:
                recorrer(elemento)

    recorrer(datos)
    return encontrados


def main():
    if len(sys.argv) < 2:
        print("ausente")
        return
    objetivo = sys.argv[1].strip().upper()
    for d in dispositivos():
        if str(d.get("device_address", "")).strip().upper() == objetivo:
            rssi = d.get("device_rssi")
            if rssi is not None:
                print(str(rssi).strip())
                return
    print("ausente")


if __name__ == "__main__":
    main()
