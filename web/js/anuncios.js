// Una sola línea oculta para lectores de pantalla. Espera a que la persona deje de
// escribir, así no se anuncia un resultado por cada tecla.
import { $ } from "./dom.js";

let espera;
export function anunciar(texto, demora = 600) {
  clearTimeout(espera);
  espera = setTimeout(() => { $("#anuncio").textContent = texto; }, demora);
}
