#!/usr/bin/env node
/**
 * Windows：用 Inno Setup 将便携目录打成 .exe 安装包（仅 CI windows-latest 调用）
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const BUNDLE_DIR = process.env.BUNDLE_DIR || '';
const STAGING_ROOT = process.env.STAGING_ROOT || join(ROOT, 'release-staging');
const VARIANT = process.env.RELEASE_VARIANT || 'zh';

const ISCC_CANDIDATES = [
  'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
  'C:\\Program Files\\Inno Setup 6\\ISCC.exe',
];

function findIscc() {
  for (const p of ISCC_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  return null;
}

function sha256File(path) {
  const h = createHash('sha256');
  h.update(readFileSync(path));
  return h.digest('hex');
}

function escIss(s) {
  return String(s).replace(/\\/g, '\\\\');
}

function main() {
  if (process.platform !== 'win32') {
    console.log('[win-installer] 非 Windows，跳过');
    return;
  }

  if (!BUNDLE_DIR || !existsSync(BUNDLE_DIR)) {
    console.error('::error::需要有效的 BUNDLE_DIR');
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(join(BUNDLE_DIR, 'manifest.json'), 'utf8'));
  const { name: bundleName, version, upstream_version, platform, variant } = manifest;

  const iscc = findIscc();
  if (!iscc) {
    console.error('::error::未找到 Inno Setup（ISCC.exe），请在工作流中 choco install innosetup');
    process.exit(1);
  }

  const appName = variant === 'zh' ? 'OpenClaw 汉化版' : 'OpenClaw';
  const appId =
    variant === 'zh'
      ? '{{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}'
      : '{{B2C3D4E5-F6A7-8901-BCDE-F12345678901}';
  const outputBase = bundleName;
  const exeName = `${outputBase}.exe`;

  const issPath = join(STAGING_ROOT, `${bundleName}.iss`);
  const iss = `\uFEFF; 由 openclaw-zh CI 自动生成
#define BundleDir "${escIss(resolve(BUNDLE_DIR))}"
#define OutputBase "${outputBase}"

[Setup]
AppId=${appId}
AppName=${appName}
AppVersion=${version}
AppVerName=${appName} ${version}
AppPublisher=agentai2026
AppPublisherURL=https://github.com/agentai2026/openclaw-zh
AppSupportURL=https://github.com/agentai2026/openclaw-zh/issues
DefaultDirName={localappdata}\\OpenClaw${variant === 'zh' ? '-zh' : ''}
DefaultGroupName=${appName}
OutputDir=${escIss(resolve(STAGING_ROOT))}
OutputBaseFilename=${outputBase}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes
PrivilegesRequired=lowest

[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\\ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加图标:"; Flags: unchecked

[Files]
Source: "{#BundleDir}\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\\OpenClaw Gateway"; Filename: "{app}\\bin\\openclaw-gateway.cmd"; WorkingDir: "{app}"
Name: "{group}\\卸载 ${appName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\\OpenClaw Gateway"; Filename: "{app}\\bin\\openclaw-gateway.cmd"; Tasks: desktopicon

[Run]
Filename: "{app}\\README.txt"; Description: "查看说明"; Flags: postinstall shellexec skipifsilent unchecked
`;

  mkdirSync(STAGING_ROOT, { recursive: true });
  writeFileSync(issPath, iss, 'utf8');

  console.log(`[win-installer] 编译 ${exeName}`);
  execSync(`"${iscc}" "${issPath}"`, { stdio: 'inherit' });

  const exePath = join(STAGING_ROOT, exeName);
  if (!existsSync(exePath)) {
    console.error(`::error::未生成 ${exePath}`);
    process.exit(1);
  }

  const sha256 = sha256File(exePath);
  const meta = {
    ...manifest,
    file: exeName,
    kind: 'installer',
    sha256,
    size: readFileSync(exePath).length,
  };
  writeFileSync(join(STAGING_ROOT, `${bundleName}.exe.meta.json`), `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`[win-installer] ${exePath} (sha256=${sha256.slice(0, 16)}…)`);
}

main();
