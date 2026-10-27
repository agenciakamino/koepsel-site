// Status de atendimento no fuso de Blumenau. Usado inline no hero (antes da primeira pintura,
// para não haver troca de texto visível) e pelo main.js nas demais seções.
// faixas: [[abreMin, fechaMin], ...]; dias: dias úteis (0 = domingo)
export function computeStatus(faixas, dias, now = new Date()) {
  const p = {};
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(now).forEach((x) => { p[x.type] = x.value; });
  const d = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  const m = (parseInt(p.hour, 10) % 24) * 60 + parseInt(p.minute, 10);
  const util = dias.includes(d);
  const open = util && faixas.some(([a, f]) => m >= a && m < f);
  const hm = (v) => Math.floor(v / 60) + 'h' + String(v % 60).padStart(2, '0');
  const [f1, f2] = faixas;
  let txt;
  if (open) txt = 'Aberto agora';
  else if (util && m < f1[0]) txt = 'Abre hoje, ' + hm(f1[0]);
  else if (util && f2 && m >= f1[1] && m < f2[0]) txt = 'Reabre às ' + hm(f2[0]);
  else if (dias.includes((d + 1) % 7)) txt = 'Abre amanhã, ' + hm(f1[0]);
  else txt = 'Abre segunda, ' + hm(f1[0]);
  return { open, txt, d };
}

export function applyStatus(s, root = document) {
  root.querySelectorAll('[data-st]').forEach((el) => el.classList.toggle('open', s.open));
  root.querySelectorAll('[data-st-txt]').forEach((el) => { el.textContent = s.txt; });
}

export function readHorario(root = document) {
  const el = root.querySelector('[data-horario]');
  return el ? [JSON.parse(el.dataset.horario), JSON.parse(el.dataset.dias)] : null;
}
