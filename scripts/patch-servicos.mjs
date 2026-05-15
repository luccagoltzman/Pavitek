import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const f = path.join(__dirname, "..", "index.html");
let s = fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");

const anchor =
  '            <p class="section__subtitle">\n              Atuação em pavimentação';
const endMarker =
  '          <a\n            class="scroll-cue"\n            href="#sobre"';

const start = s.indexOf(anchor);
const end = s.indexOf(endMarker, start);
if (start < 0 || end < 0) {
  console.error("markers not found", { start, end });
  process.exit(1);
}

const ins = `            <p class="section__subtitle">
              Os serviços abaixo são geridos no painel administrativo. As imagens
              são servidas pelo Supabase Storage.
            </p>
            <nav
              class="services__jump"
              id="services-jump"
              aria-label="Atalhos para serviços"
            ></nav>

          <div id="servicos-root" class="services">
            <p
              class="services__state services__state--loading"
              id="servicos-state"
            >
              Carregando serviços…
            </p>
          </div>

`;

s = s.slice(0, start) + ins + s.slice(end);
fs.writeFileSync(f, s);
console.log("ok");
