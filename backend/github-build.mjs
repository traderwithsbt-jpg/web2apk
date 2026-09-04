import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "work");
const TEMPLATE = path.join(__dirname, "android-template");

function safePackage(value) {
  let v = String(value || "com.example.webapp").toLowerCase()
    .replace(/[^a-z0-9_.]/g, ".").replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  if (!v.includes(".")) v = `com.example.${v || "webapp"}`;
  return v.split(".").map((x) => (/^[a-z_]/.test(x) ? x : `x${x}`)).join(".");
}
function safeAppName(value) {
  return String(value || "Web App").replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0,40) || "Web App";
}
function xmlEscape(s){return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function color(value, fallback){return /^#[0-9a-fA-F]{6}$/.test(String(value||""))?String(value):fallback;}
function bool(v, d=false){return v===true || v==="true" ? true : v===false || v==="false" ? false : d;}
function javaEscape(s){return String(s).replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\r/g,"\\r").replace(/\n/g,"\\n");}
function isHttp(u){return /^https?:\/\//i.test(u||"");}
function absoluteUrl(base, raw){try{return new URL(raw,base).href}catch{return null}}
function shouldFetchAsset(u){return isHttp(u)&&/\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|mp3|mp4|webm|json)(\?.*)?$/i.test(u);}
async function copyRecursive(src,dst){
  await fs.ensureDir(dst);
  for(const e of await fs.readdir(src,{withFileTypes:true})){
    const a=path.join(src,e.name),b=path.join(dst,e.name);
    if(e.isDirectory()) await copyRecursive(a,b); else await fs.copyFile(a,b);
  }
}
async function downloadText(url){
  const r=await fetch(url,{redirect:"follow",headers:{"User-Agent":"Web2APK/1.0"}});
  if(!r.ok) throw new Error(`Website returned HTTP ${r.status}`);
  return {text:await r.text(),finalUrl:r.url};
}
async function mirrorWebsite(inputUrl,outDir){
  const {text:html,finalUrl}=await downloadText(inputUrl);
  const base=new URL(finalUrl); await fs.ensureDir(outDir);
  const assetMap=new Map(), candidates=new Set();
  const attrRe=/(?:src|href|poster)=["']([^"']+)["']/gi;
  let m;
  while((m=attrRe.exec(html))){const u=absoluteUrl(base.href,m[1]);if(u&&new URL(u).origin===base.origin&&shouldFetchAsset(u))candidates.add(u);}
  const cssRe=/url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while((m=cssRe.exec(html))){const u=absoluteUrl(base.href,m[1]);if(u&&new URL(u).origin===base.origin&&shouldFetchAsset(u))candidates.add(u);}
  let i=0;
  for(const u of candidates){try{
    const r=await fetch(u,{redirect:"follow",headers:{"User-Agent":"Web2APK/1.0"}}); if(!r.ok)continue;
    const ct=r.headers.get("content-type")||"", ext=path.extname(new URL(u).pathname)||(ct.includes("javascript")?".js":ct.includes("css")?".css":"");
    const file=`asset_${String(i++).padStart(4,"0")}${ext}`,buf=Buffer.from(await r.arrayBuffer());
    await fs.writeFile(path.join(outDir,file),buf); assetMap.set(u,file);
  }catch{}}
  let rewritten=html.replace(attrRe,(all,raw)=>{const u=absoluteUrl(base.href,raw);return u&&assetMap.has(u)?all.replace(raw,assetMap.get(u)):all;});
  rewritten=rewritten.replace(cssRe,(all,raw)=>{const u=absoluteUrl(base.href,raw);return u&&assetMap.has(u)?all.replace(raw,assetMap.get(u)):all;});
  await fs.writeFile(path.join(outDir,"index.html"),rewritten,"utf8");
}
async function makeIcon(src,resDir){
  const dirs=["mipmap-mdpi","mipmap-hdpi","mipmap-xhdpi","mipmap-xxhdpi","mipmap-xxxhdpi"],sizes=[48,72,96,144,192];
  for(let i=0;i<dirs.length;i++){const d=path.join(resDir,dirs[i]);await fs.ensureDir(d);await sharp(src).resize(sizes[i],sizes[i],{fit:"cover"}).png().toFile(path.join(d,"ic_launcher.png"));}
}
async function makeSplash(src,resDir){
  const d=path.join(resDir,"drawable-nodpi");await fs.ensureDir(d);
  await sharp(src).resize(1080,1920,{fit:"inside",withoutEnlargement:true}).png().toFile(path.join(d,"splash_logo.png"));
}
async function downloadFile(url,dest){
  if(!isHttp(url)) throw new Error("Invalid image URL");
  const r=await fetch(url,{redirect:"follow"}); if(!r.ok) throw new Error(`Image returned HTTP ${r.status}`);
  await fs.writeFile(dest,Buffer.from(await r.arrayBuffer()));
}
async function main(){
  const input=JSON.parse(await fs.readFile(process.argv[2],"utf8"));
  if(!isHttp(input.url)) throw new Error("Valid website URL required");
  const project=path.join(ROOT,input.jobId,"project");
  await fs.remove(project); await copyRecursive(TEMPLATE,project);
  // Use PNG launcher assets on every Android version so a custom icon is never
  // hidden by the template adaptive-icon resource.
  await fs.remove(path.join(project,"app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml"));
  const appName=safeAppName(input.appName),pkg=safePackage(input.packageName),pkgPath=path.join(...pkg.split("."));
  const srcRoot=path.join(project,"app/src/main/java"),oldJava=path.join(srcRoot,"com/example/web2apk/MainActivity.java"),newJavaDir=path.join(srcRoot,pkgPath);
  await fs.ensureDir(newJavaDir);
  let java=await fs.readFile(oldJava,"utf8"); await fs.remove(path.dirname(oldJava));
  java=java.replaceAll("com.example.web2apk",pkg).replaceAll("WEB2APK_APP_NAME",javaEscape(appName)).replaceAll("WEB2APK_WEBSITE_URL",javaEscape(input.url))
    .replaceAll("WEB2APK_ORIENTATION",["portrait","landscape","sensor"].includes(input.orientation)?input.orientation:"portrait")
    .replaceAll("WEB2APK_SPLASH_ENABLED",String(bool(input.splashEnabled,true)))
    .replaceAll("WEB2APK_SPLASH_MS",String(Math.max(0,Math.min(10000,Number(input.splashMs)||2000))))
    .replaceAll("WEB2APK_SPLASH_BG_TYPE",input.splashBgType==="gradient"?"gradient":"solid")
    // Replace BG2 before BG because WEB2APK_SPLASH_BG is a substring of
    // WEB2APK_SPLASH_BG2. Reversing these lines prevents values such as
    // #0B10202 from being generated, which would crash Color.parseColor()
    // immediately when the APK starts.
    .replaceAll("WEB2APK_SPLASH_BG2",color(input.splashBg2,"#242B55"))
    .replaceAll("WEB2APK_SPLASH_BG",color(input.splashBg,"#0B1020"))
    .replaceAll("WEB2APK_SPLASH_TEXT",color(input.splashText,"#FFFFFF"))
    .replaceAll("WEB2APK_SPLASH_ACCENT",color(input.splashAccent,"#7C72FF"))
    .replaceAll("WEB2APK_SPLASH_ALIGN",["center","top","bottom"].includes(input.splashAlign)?input.splashAlign:"center")
    .replaceAll("WEB2APK_SPLASH_LOADING",["bar","spinner","dots","none"].includes(input.splashLoading)?input.splashLoading:"bar")
    .replaceAll("WEB2APK_SPLASH_ANIMATION",["fade","zoom","slideup","none"].includes(input.splashAnimation)?input.splashAnimation:"fade")
    .replaceAll("WEB2APK_SPLASH_TITLE",javaEscape(input.splashTitle||appName))
    .replaceAll("WEB2APK_SPLASH_TAGLINE",javaEscape(input.splashTagline||""))
    .replaceAll("WEB2APK_SPLASH_SHOW_LOGO",String(bool(input.splashShowLogo,true)))
    .replaceAll("WEB2APK_SPLASH_SHOW_TITLE",String(bool(input.splashShowTitle,true)))
    .replaceAll("WEB2APK_SPLASH_SHOW_TAGLINE",String(bool(input.splashShowTagline,false)))
    .replaceAll("WEB2APK_SPLASH_SHOW_LOADING",String(bool(input.splashShowLoading,true)))
    .replaceAll("WEB2APK_BACK_NAVIGATION",String(bool(input.backNavigation,true)))
    .replaceAll("WEB2APK_INTERNET_CHECK",String(bool(input.internetCheck,true)))
    .replaceAll("WEB2APK_FILE_UPLOAD",String(bool(input.fileUpload,true)))
    .replaceAll("WEB2APK_FILE_DOWNLOAD",String(bool(input.fileDownload,true)))
    .replaceAll("WEB2APK_PULL_TO_REFRESH",String(bool(input.pullToRefresh,false)))
    .replaceAll("WEB2APK_EXTERNAL_LINKS",String(bool(input.externalLinks,true)))
    .replaceAll("WEB2APK_ZOOM_ENABLED",String(bool(input.zoomEnabled,false)))
    .replaceAll("WEB2APK_KEEP_SCREEN_ON",String(bool(input.keepScreenOn,false)))
    .replaceAll("WEB2APK_PREVENT_SCREENSHOTS",String(bool(input.preventScreenshots,false)))
    .replaceAll("WEB2APK_CAMERA_PERMISSION",String(bool(input.cameraPermission,false)))
    .replaceAll("WEB2APK_MICROPHONE_PERMISSION",String(bool(input.microphonePermission,false)))
    .replaceAll("WEB2APK_LOCATION_PERMISSION",String(bool(input.locationPermission,false)))
    .replaceAll("WEB2APK_EXIT_CONFIRM",String(bool(input.exitConfirm,true)));
  await fs.writeFile(path.join(newJavaDir,"MainActivity.java"),java);
  const mf=path.join(project,"app/src/main/AndroidManifest.xml");
  let manifest=await fs.readFile(mf,"utf8");
  const orient=["portrait","landscape","sensor"].includes(input.orientation)?input.orientation:"portrait";
  manifest=manifest.replaceAll("com.example.web2apk",pkg).replace("android:screenOrientation=\"portrait\"",`android:screenOrientation="${orient}"`);
  const perms=[];
  if(bool(input.cameraPermission,false)) perms.push('<uses-permission android:name="android.permission.CAMERA"/>');
  if(bool(input.microphonePermission,false)) perms.push('<uses-permission android:name="android.permission.RECORD_AUDIO"/>');
  if(bool(input.locationPermission,false)) perms.push('<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>');
  manifest=manifest.replace('</manifest>', perms.join('')+'\n</manifest>');
  await fs.writeFile(mf,manifest);
  const gb=path.join(project,"app/build.gradle");
  let gradle=await fs.readFile(gb,"utf8"); gradle=gradle.replace(/namespace "com\.example\.web2apk"/,`namespace "${pkg}"`).replace(/applicationId "com\.example\.web2apk"/,`applicationId "${pkg}"`).replace(/versionName "1\.0"/,`versionName "${String(input.versionName||"1.0").replace(/"/g,"")}"`).replace(/versionCode 1/,`versionCode ${Math.max(1,parseInt(input.versionCode||"1",10)||1)}`);
  await fs.writeFile(gb,gradle);
  await fs.writeFile(path.join(project,"app/src/main/res/values/strings.xml"),`<resources><string name="app_name">${xmlEscape(appName)}</string></resources>`);
  // Prefer the image uploaded by Blogger through the Worker. Public HTTPS URLs
  // remain supported as a fallback.
  if(input.iconPath){
    const p=path.resolve(process.cwd(),input.iconPath);
    if(!p.startsWith(path.resolve(process.cwd()) + path.sep)) throw new Error("Invalid icon path");
    if(await fs.pathExists(p)) await makeIcon(p,path.join(project,"app/src/main/res"));
  } else if(input.iconUrl){
    const p=path.join(ROOT,input.jobId,"icon"); await fs.ensureDir(path.dirname(p));
    await downloadFile(input.iconUrl,p); await makeIcon(p,path.join(project,"app/src/main/res"));
  }
  if(input.splashPath){
    const p=path.resolve(process.cwd(),input.splashPath);
    if(!p.startsWith(path.resolve(process.cwd()) + path.sep)) throw new Error("Invalid splash path");
    if(await fs.pathExists(p)) await makeSplash(p,path.join(project,"app/src/main/res"));
  } else if(input.splashUrl){
    const p=path.join(ROOT,input.jobId,"splash"); await fs.ensureDir(path.dirname(p));
    await downloadFile(input.splashUrl,p); await makeSplash(p,path.join(project,"app/src/main/res"));
  }
  // The packaged app loads the live website URL. This is much more reliable for
  // modern sites than copying only a subset of their assets into the APK.

}
main().catch(e=>{console.error(e);process.exit(1)});
