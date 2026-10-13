/* global React */
const { useState } = React;

/* -------- CONTACT / FOOTER -------- */
function ContactBlock() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <section className="kcl-contact" id="contacto">
      <div className="kcl-contact-grid">
        <div className="kcl-contact-left">
          <div className="kcl-eyebrow" style={{color:'#00FF41'}}>CONTACTO · 2025</div>
          <h2>Escribe.<br/>Responderemos.</h2>
          <p className="lead">No hay formularios largos. Dinos qué observas y trazamos desde ahí.</p>
        </div>
        <form className="kcl-contact-form" onSubmit={e => { e.preventDefault(); setSent(true); }}>
          <label>EMAIL</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="hola@karma.lab" required />
          <label>MENSAJE</label>
          <textarea rows="3" defaultValue="Quiero observar un sistema."></textarea>
          <button type="submit" className="kcl-btn kcl-btn-primary kcl-btn-wide">
            {sent ? 'RECIBIDO ★' : 'ENVIAR →'}
          </button>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="kcl-footer">
      <div className="kcl-footer-grid">
        <div>
          <img src="../../assets/logos/karma-logo-blanco.png" alt="karma" className="kcl-footer-logo" />
          <p>Laboratorio estratégico.</p>
        </div>
        <div>
          <div className="kcl-eyebrow">NAVEGACIÓN</div>
          <a>Manifiesto</a><a>Servicios</a><a>Blog</a><a>Reservas</a>
        </div>
        <div>
          <div className="kcl-eyebrow">SISTEMA</div>
          <a>Brandbook</a><a>Tienda</a><a>Contacto</a>
        </div>
        <div>
          <div className="kcl-eyebrow">CANAL</div>
          <a>Instagram</a><a>Are.na</a><a>hola@karma.lab</a>
        </div>
      </div>
      <div className="kcl-footer-bar">
        <span className="kcl-barcode">║║│║│║││║│║│║││║│║│║││║│║│║││║│║│║││║│║</span>
        <span>KARMA-CREATIVE-LAB-2025-LIVING-SYSTEM</span>
      </div>
    </footer>
  );
}

Object.assign(window, { ContactBlock, Footer });
