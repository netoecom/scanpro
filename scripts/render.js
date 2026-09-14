const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const storeDir = path.resolve(__dirname, '../assets/store');

const banners = ['banner_1', 'banner_2', 'banner_3', 'banner_4', 'banner_5'];

for (let i = 0; i < banners.length; i++) {
  const name = banners[i];
  const num = i + 1;
  const htmlFile = path.resolve(__dirname, `${name}.html`);
  const outFile = path.join(storeDir, `playstore_screen_${num}.png`);

  if (fs.existsSync(htmlFile)) {
    console.log(`[${num}/5] Renderizando ${name} -> playstore_screen_${num}.png...`);
    const fileUrl = 'file:///' + htmlFile.replace(/\\/g, '/');
    const cmd = `"${edgeExe}" --headless=old --disable-gpu "--screenshot=${outFile}" --window-size=1080,1920 --hide-scrollbars "${fileUrl}"`;
    try {
      execSync(cmd, { stdio: 'pipe' });
      // Aguardar escrita no disco se necessário
      let attempts = 0;
      while (!fs.existsSync(outFile) && attempts < 10) {
        execSync('timeout /t 1 > nul', { shell: 'cmd.exe' });
        attempts++;
      }
      if (fs.existsSync(outFile)) {
        const stats = fs.statSync(outFile);
        console.log(`✓ Gerado com sucesso: playstore_screen_${num}.png (${(stats.size / 1024).toFixed(1)} KB)`);
      } else {
        console.error(`✗ Erro: Arquivo não foi gerado em ${outFile}`);
      }
    } catch (err) {
      console.error(`Erro ao renderizar ${name}:`, err.message);
    }
  } else {
    console.log(`[${num}/5] ${name}.html ainda não existe.`);
  }
}
