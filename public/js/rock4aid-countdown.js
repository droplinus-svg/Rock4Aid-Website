/* ROCK4AID – Countdown-Ticket ("Bühne frei in …")
 * Web Component, keine Abhängigkeiten, kein externer Font-Load.
 * Nutzung:  <script src="/js/rock4aid-countdown.js" defer></script>
 *           <r4a-countdown target="2027-07-10T18:00:00"></r4a-countdown>
 * Attribute: target (ISO-Datum, Pflicht) · label (Default "BÜHNE FREI IN")
 *            note (Default "ADMIT ALL · SPENDENBASIS") · tilt (Grad, Default -2.2)
 * Hinweis: zeigt TAGE/STD/MIN (ohne Sekunden – bewusst so gewünscht).
 */
(function () {
  const PAD = n => String(n).padStart(2, '0');

  class R4aCountdown extends HTMLElement {
    connectedCallback() {
      if (this._built) return;
      this._built = true;
      const tilt = this.getAttribute('tilt') || '-2.2';
      const label = this.getAttribute('label') || 'BÜHNE FREI IN';
      const note = this.getAttribute('note') || 'ADMIT ALL · SPENDENBASIS';
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          :host { display:inline-block; font-family:"Archivo","Archivo Fallback",system-ui,sans-serif; }
          .stub { position:relative; transform:rotate(${tilt}deg); background:#fbf6e9;
                  padding:14px 12px 8px; box-shadow:0 6px 14px rgba(20,8,40,.30);
                  border-left:2px dashed #cbbf9e; }
          .tape { position:absolute; top:-5px; left:50%; width:46px; height:10px;
                  transform:translateX(-50%) rotate(3deg); background:rgba(232,182,44,.5);
                  border:1px solid rgba(232,182,44,.7); }
          .label { position:relative; z-index:1; font-weight:700; font-size:8px; line-height:1;
                   letter-spacing:.18em; color:#8a5c07; margin-bottom:6px; }
          .row { display:flex; gap:7px; align-items:flex-end; }
          .u { display:flex; flex-direction:column; align-items:center; gap:2px; min-width:26px; }
          .v { font-weight:700; font-size:17px; line-height:1; color:#2c2331;
               font-variant-numeric:tabular-nums; }
          .l { font-weight:400; font-size:7px; line-height:1; letter-spacing:.1em; color:#8a7a5b; }
          .note { margin-top:7px; padding-top:5px; border-top:1px dashed #cbbf9e;
                  font-size:7px; line-height:1.3; letter-spacing:.08em; color:#8a7a5b; }
          @media (max-width:640px) { .v { font-size:15px } .u { min-width:23px } }
        </style>
        <div class="stub" part="stub">
          <span class="tape"></span>
          <div class="label">${label}</div>
          <div class="row">
            ${['TAGE','STD','MIN'].map(l =>
              `<div class="u"><span class="v" data-v="${l}">–</span><span class="l">${l}</span></div>`).join('')}
          </div>
          <div class="note">${note}</div>
        </div>`;
      this._cells = {};
      root.querySelectorAll('[data-v]').forEach(el => this._cells[el.dataset.v] = el);
      this._tick();
      this._timer = setInterval(() => this._tick(), 1000);
    }

    disconnectedCallback() { clearInterval(this._timer); }

    _tick() {
      const t = new Date(this.getAttribute('target') || '').getTime();
      if (isNaN(t)) { this.style.display = 'none'; return; }
      this.style.display = 'inline-block';
      let s = Math.max(0, Math.floor((t - Date.now()) / 1000));
      const set = (k, v) => { if (this._cells[k].textContent !== v) this._cells[k].textContent = v; };
      set('TAGE', String(Math.floor(s / 86400)));
      set('STD', PAD(Math.floor(s % 86400 / 3600)));
      set('MIN', PAD(Math.floor(s % 3600 / 60)));
      if (s === 0) { clearInterval(this._timer); this.dispatchEvent(new CustomEvent('r4a:reached')); }
    }
  }

  if (!customElements.get('r4a-countdown')) customElements.define('r4a-countdown', R4aCountdown);
})();
