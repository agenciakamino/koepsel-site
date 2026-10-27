// Entra inline logo após o status do hero (CSP libera por hash gerado no build)
import { computeStatus, applyStatus, readHorario } from './status.js';

const h = readHorario();
if (h) applyStatus(computeStatus(h[0], h[1]));
