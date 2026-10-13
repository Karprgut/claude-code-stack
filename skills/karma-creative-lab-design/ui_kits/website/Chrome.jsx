/* global React */
const { useState } = React;

/* -------- STICKY MENU -------- */
function StickyMenu({ current, onNav }) {
  const [open, setOpen] = useState(false);
  const items = [
    { id: 'manifiesto', label: 'Manifiesto' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'proceso', label: 'Proceso' },
    { id: 'blog', label: 'Blog' },
    { id: 'contacto', label: 'Contacto' },
  ];
  return (
    <div className="kcl-menu">
      <button className="kcl-menu-toggle" onClick={() => setOpen(o => !o)} aria-label="Menu">
        {open ? '×' : '★'}
      </button>
      {open && (
        <div className="kcl-menu-postit">
          {items.map(it => (
            <a
              key={it.id}
              className={'kcl-menu-link' + (current === it.id ? ' active' : '')}
              onClick={e => { e.preventDefault(); onNav?.(it.id); setOpen(false); }}
              href={'#' + it.id}
            >{it.label}</a>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------- TICKER -------- */
function Ticker({ items }) {
  const phrases = items || [
    'ESTRUCTURAS QUE PIENSAN',
    'SISTEMA QUE MUTA',
    'PROCESAR ES CREAR',
    'EL RUIDO TAMBIÉN ES LENGUAJE',
    'ARQUITECTURA VISUAL PARA IDEAS VIVAS',
  ];
  const doubled = [...phrases, ...phrases];
  return (
    <div className="kcl-ticker">
      <div className="kcl-ticker-track">
        {doubled.map((p, i) => (
          <React.Fragment key={i}>
            <span className={'kcl-ticker-item ' + (i % 3 === 1 ? 'g' : i % 5 === 2 ? 'r' : '')}>{p}</span>
            <span className="kcl-ticker-star">★</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* -------- BUTTONS -------- */
function Button({ variant = 'primary', children, onClick, arrow }) {
  return (
    <button className={'kcl-btn kcl-btn-' + variant} onClick={onClick}>
      {children}{arrow && <span className="kcl-btn-arrow">→</span>}
    </button>
  );
}

Object.assign(window, { StickyMenu, Ticker, Button });
