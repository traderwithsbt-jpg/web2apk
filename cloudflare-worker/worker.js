export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response("", {headers: cors()});
    try {
      if (url.pathname === "/health") return json({ok:true,service:"Web2APK GitHub Actions Gateway"});
      if (url.pathname === "/build" && request.method === "POST") return await createBuild(request, env);
      if (url.pathname.startsWith("/status/") && request.method === "GET") return await status(url.pathname.split("/").pop(), env);
      return json({error:"Not found"},404);
    } catch(e) { return json({error:e.message||String(e)},500); }
  }
};
function cors(){return {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"};}
function json(x,status=200){return new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json",...cors()}});}
async function gh(path,env,opts={}){
  const r=await fetch("https://api.github.com"+path,{...opts,headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${env.GITHUB_TOKEN}`,"X-GitHub-Api-Version":"2022-11-28","User-Agent":"Web2APK-Gateway",...(opts.headers||{})}});
  const text=await r.text(); let data; try{data=JSON.parse(text)}catch{data={raw:text}};
  if(!r.ok) throw new Error(data.message||`GitHub API ${r.status}`);
  return data;
}
async function createBuild(request,env){
  const b=await request.json();
  if(!/^https?:\/\//i.test(b.url||"")) return json({error:"Valid http/https website URL is required."},400);
  const jobId=crypto.randomUUID().replaceAll("-","");
  const inputs={job_id:jobId,website_url:b.url,app_name:b.appName||"My Website App",package_name:b.packageName||"com.web2apk.app",version_name:b.versionName||"1.0",version_code:String(b.versionCode||1),orientation:b.orientation==="landscape"?"landscape":"portrait",splash_ms:String(b.splashMs||2000),exit_confirm:String(b.exitConfirm!==false),internet_check:String(b.internetCheck!==false),file_upload:String(b.fileUpload!==false),file_download:String(b.fileDownload!==false),icon_url:b.iconUrl||"",splash_url:b.splashUrl||""};
  await gh(`/repos/${env.GITHUB_REPO}/actions/workflows/build-web2apk.yml/dispatches`,env,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ref:env.GITHUB_REF||"main",inputs})});
  return json({jobId,status:"queued"});
}
async function status(jobId,env){
  const release=await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/releases/tags/web2apk-${encodeURIComponent(jobId)}`,{headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${env.GITHUB_TOKEN}`,"X-GitHub-Api-Version":"2022-11-28","User-Agent":"Web2APK-Gateway"}});
  if(release.ok){
    const r=await release.json(); const asset=r.assets?.find(a=>a.name.endsWith(".apk"));
    return json({id:jobId,status:"complete",progress:100,downloadUrl:asset?.browser_download_url||r.html_url,logs:["APK ready"]});
  }
  return json({id:jobId,status:"building",progress:50,logs:["GitHub Actions is building your APK…"]});
}
