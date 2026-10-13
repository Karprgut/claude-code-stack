import {
  reactExtension,
  Banner,
  BlockStack,
  Button,
  Text,
  useAttributeValues,
} from '@shopify/ui-extensions-react/checkout';
import { useEffect, useRef, useState } from 'react';

// Backend de Karma (Vercel). El endpoint /api/strategy/status responde CORS *.
const API = 'https://<tu-backend>.vercel.app';
const POLL_MS = 3000;
const MAX_TRIES = 60; // ~3 min de margen (Claude suele tardar 70-100s)

export default reactExtension('purchase.thank-you.block.render', () => <Estrategia />);

function Estrategia() {
  // El wizard guarda el submissionId como cart attribute antes del checkout.
  const [submissionId] = useAttributeValues(['submissionId']);
  const [phase, setPhase] = useState('loading'); // loading | ready | timeout
  const [url, setUrl] = useState(null);
  const [tries, setTries] = useState(0); // para que el mensaje evolucione
  const triesRef = useRef(0);

  useEffect(() => {
    if (!submissionId) return;
    let cancelled = false;

    async function poll() {
      triesRef.current += 1;
      if (!cancelled) setTries(triesRef.current);
      try {
        const res = await fetch(
          `${API}/api/strategy/status?submissionId=${encodeURIComponent(submissionId)}`,
        );
        const data = await res.json();
        if (!cancelled && data && data.status === 'completed' && data.publicUrl) {
          setUrl(data.publicUrl);
          setPhase('ready');
          return true;
        }
      } catch (_e) {
        // error de red: reintenta en el siguiente tick
      }
      if (!cancelled && triesRef.current >= MAX_TRIES) {
        setPhase('timeout');
        return true;
      }
      return false;
    }

    const id = setInterval(async () => {
      if (await poll()) clearInterval(id);
    }, POLL_MS);
    poll();

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [submissionId]);

  // Pedido normal (sin estrategia): no renderizar nada.
  if (!submissionId) return null;

  if (phase === 'ready') {
    return (
      <Banner status="success" title="¡Tu estrategia está lista! 🟢">
        <BlockStack spacing="base">
          <Text>Generamos tu plan de marketing accionable. Ábrelo aquí:</Text>
          <Button to={url}>VER MI ESTRATEGIA →</Button>
        </BlockStack>
      </Banner>
    );
  }

  if (phase === 'timeout') {
    return (
      <Banner status="warning" title="Tu estrategia está tardando un poco más">
        <Text>
          Te la enviamos por correo en cuanto esté lista (revisa también spam). Gracias por
          tu compra.
        </Text>
      </Banner>
    );
  }

  // Mensaje que evoluciona para que no se sienta colgado.
  const elapsedMsg =
    tries * (POLL_MS / 1000) >= 75
      ? 'Casi listo, estamos afinando los números… no cierres esta página.'
      : 'Esto suele tardar 1–2 minutos. Puedes quedarte en esta página; también te llegará por correo.';

  return (
    <Banner title="Estamos generando tu estrategia…">
      <Text>{elapsedMsg}</Text>
    </Banner>
  );
}
