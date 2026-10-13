/* global React */
const { useState } = React;

/* -------- HERO: 2x3 grid -------- */
function Hero({ onGo }) {
  const procs = [
    { id: 'obs', label: 'Observar', icon: '../../assets/icons/observar.svg' },
    { id: 'int', label: 'Interpretar', icon: '../../assets/icons/interpretar.svg' },
    { id: 'tra', label: 'Trazar', icon: '../../assets/icons/trazar.svg' },
  ];
  return (
    <section className="kcl-hero" id="hero">
      <div className="kcl-hero-title">
        <h1>Laboratorio<br/>Estratégico</h1>
      </div>

      <div className="kcl-hero-sistemas">
        <h2>
          <span className="big">NUESTROS</span>
          <span className="small">SISTEMAS</span>
          <span className="big">VIVOS ★</span>
        </h2>
      </div>

      <div className="kcl-hero-logo">
        <img src="../../assets/logos/karma-logo-blanco.png" alt="karma" />
      </div>

      <div className="kcl-hero-process">
        {procs.map(p => (
          <button key={p.id} className="kcl-proc-card">
            <img src={p.icon} alt="" />
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      <div className="kcl-hero-go">
        <button className="kcl-btn-go" onClick={onGo}>
          GO <span>→</span>
        </button>
      </div>

      <div className="kcl-hero-glitch">
        <img src="../../assets/bg/glitch.gif" alt="" />
      </div>
    </section>
  );
}

/* -------- MANIFESTO -------- */
function Manifesto() {
  return (
    <section className="kcl-manifesto" id="manifiesto">
      <div className="kcl-manifesto-header">¿QUÉ ES KARMA CREATIVE LAB?</div>
      <div className="kcl-manifesto-content">
        <div className="kcl-manifesto-side"><img src="../../assets/bg/glitch.gif" alt="" /></div>
        <div className="kcl-manifesto-main">
          <p>Karma Creative Lab es un laboratorio de estrategia y creatividad.</p>
          <p>Aplicamos procesos de investigación, análisis estructural y composición visual. Cada proyecto es un sistema vivo que requiere su propia fórmula: una mezcla específica de observación, modelado y ejecución.</p>
          <p>Actuamos como científicos creativos. Experimentamos, medimos y ajustamos hasta encontrar la estructura exacta.</p>
          <p><strong>No diseñamos para gustar. Diseñamos para funcionar.</strong></p>
        </div>
        <div className="kcl-manifesto-side"><img src="../../assets/bg/glitch.gif" alt="" /></div>
      </div>
    </section>
  );
}

/* -------- SERVICES GRID -------- */
const SERVICES = [
  { id: '01', title: 'Alineación de Producto', desc: 'Estrategia + estructura. Loops, retículas y direcciones.', img: '../../assets/services/estrategia.webp' },
  { id: '02', title: 'Estrategia de Audiencia', desc: 'Redes, conexiones, targets rotos. Mapas que muten.', img: '../../assets/services/producto.webp' },
  { id: '03', title: 'Estrategia de Contenido', desc: 'Frecuencias y loops. Ruido visual con propósito.', img: '../../assets/services/contenido.webp' },
  { id: '04', title: 'Producción Artística', desc: 'Textura + distorsión. Lo físico encontrando lo digital.', img: '../../assets/services/artistico.webp' },
  { id: '05', title: 'Capacitación', desc: 'Proceso + esquema. Rutas visibles y navegables.', img: '../../assets/services/capacitacion.webp' },
  { id: '06', title: 'AI Training', desc: 'Prompts como materia prima. Neural como estructura.', img: '../../assets/services/ai.webp' },
];

function Services({ onSelect }) {
  return (
    <section className="kcl-services" id="servicios">
      <div className="kcl-services-header">
        <div className="kcl-eyebrow">06 SERVICIOS</div>
        <h2>Sistemas<br/>Vivos.</h2>
      </div>
      <div className="kcl-service-grid">
        {SERVICES.map(s => (
          <article key={s.id} className="kcl-service-card" onClick={() => onSelect?.(s)}>
            <div className="kcl-service-badge">{s.id}</div>
            <div className="kcl-service-img" style={{ backgroundImage: `url(${s.img})` }} />
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
            <div className="kcl-service-deco-br"></div>
            <div className="kcl-service-deco-tl"></div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* -------- SERVICE DETAIL -------- */
function ServiceDetail({ service, onBack }) {
  return (
    <section className="kcl-service-detail">
      <button className="kcl-back" onClick={onBack}>← VOLVER</button>
      <div className="kcl-service-detail-grid">
        <div className="kcl-service-detail-img" style={{ backgroundImage: `url(${service.img})` }}>
          <div className="kcl-service-detail-num">{service.id}</div>
        </div>
        <div className="kcl-service-detail-body">
          <div className="kcl-eyebrow">SERVICIO {service.id}</div>
          <h2>{service.title}</h2>
          <p className="lead">{service.desc}</p>
          <p>Cada pieza del sistema se ajusta: observamos el terreno, interpretamos patrones y trazamos rutas posibles. El error es parte del código.</p>
          <div className="kcl-actions">
            <button className="kcl-btn kcl-btn-primary">AGENDAR <span className="kcl-btn-arrow">→</span></button>
            <button className="kcl-btn kcl-btn-secondary">VER CASOS</button>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Hero, Manifesto, Services, ServiceDetail, SERVICES });
