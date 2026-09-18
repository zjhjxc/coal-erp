// ===== 煤炭进销存 共享数据层 =====
// 全局状态（所有页面通过 localStorage 共享）
let purchaseList = [];
let saleList = [];
let coalMixRecordList = [];
let mixSelectedList = [];
let stockStartTon = 0;
let stockStartMoney = 0;

// ================== 全局界面美化（自动作用于所有页面） ==================
(function(){
  if(typeof document!=="undefined" && document.getElementById){
    if(!document.getElementById("coalGlobalStyle")){
      var st=document.createElement("style");
      st.id="coalGlobalStyle";
      st.textContent=[
        '*{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}',
        'body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif}',
        '.bg-white.rounded-2xl{background:linear-gradient(180deg,#ffffff,#fcfaf3);box-shadow:0 1px 3px rgba(90,60,10,.06),0 10px 26px rgba(90,60,10,.10);transition:box-shadow .25s,transform .2s;border:1px solid rgba(201,154,46,.16)!important}',
        '.bg-white.rounded-2xl:hover{box-shadow:0 4px 8px rgba(90,60,10,.08),0 24px 50px rgba(90,60,10,.16);transform:translateY(-3px)}',
        '.bg-white.rounded-xl{box-shadow:0 3px 12px rgba(90,60,10,.09),inset 0 1px 0 rgba(255,255,255,.65)}',
        'table thead tr{background:linear-gradient(180deg,#f7f0dd,#ece0c0)!important}',
        'table thead th{color:#5a4520!important;font-weight:600;letter-spacing:.02em}',
        'table tbody tr{transition:background .15s ease}',
        'table tbody tr:hover{background:#fbf6e9!important}',
        'button{transition:filter .15s,transform .1s,box-shadow .15s}',
        'button:hover{filter:brightness(1.08)}',
        'button:active{transform:translateY(1px)}',
        '.bg-blue-600,.bg-blue-500,.bg-blue-700,.bg-blue-400,.text-white.bg-blue-600{background:linear-gradient(135deg,#e8c55c,#c99a2e 50%,#b18a1f)!important;color:#1a1408!important;box-shadow:0 3px 10px rgba(177,138,31,.35),inset 0 1px 0 rgba(255,255,255,.5),inset 0 -2px 0 rgba(90,60,10,.2)!important}',
        'input,select,textarea{transition:border-color .2s,box-shadow .2s}',
        'input:focus,select:focus,textarea:focus{border-color:#c99a2e!important;box-shadow:0 0 0 3px rgba(201,154,46,.15)!important;outline:none}',
        '.overflow-x-auto{border-radius:12px;box-shadow:inset 0 0 0 1px rgba(201,154,46,.14),0 4px 16px rgba(90,60,10,.07)}',
        '.border.rounded-xl{box-shadow:0 4px 14px rgba(90,60,10,.10),inset 0 1px 0 rgba(255,255,255,.75);transition:box-shadow .2s,transform .15s}',
        '.border.rounded-xl:hover{box-shadow:0 7px 20px rgba(90,60,10,.16),inset 0 1px 0 rgba(255,255,255,.75)}',
        '.inp{box-shadow:inset 0 1px 2px rgba(90,60,10,.05)}',
        'section,form>div,form>div>div{transition:box-shadow .2s}',
        '::-webkit-scrollbar{width:8px;height:8px}',
        '::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px}',
        '::-webkit-scrollbar-track{background:transparent}',
        '.stat{border-radius:14px;padding:14px 16px;color:#fff;position:relative;overflow:hidden;box-shadow:0 6px 18px rgba(90,60,10,.20),inset 0 1px 0 rgba(255,255,255,.28),inset 0 -3px 0 rgba(0,0,0,.12)}',
        '.stat::after{content:"";position:absolute;right:-20px;top:-20px;width:70px;height:70px;background:rgba(255,255,255,.12);border-radius:50%}',
        '.stat-blue{background:linear-gradient(135deg,#3b82f6,#2563eb)}',
        '.stat-cyan{background:linear-gradient(135deg,#06b6d4,#0891b2)}',
        '.stat-green{background:linear-gradient(135deg,#10b981,#059669)}',
        '.stat-emerald{background:linear-gradient(135deg,#34d399,#0d9488)}',
        '.stat-amber{background:linear-gradient(135deg,#f59e0b,#d97706)}',
        '.stat-red{background:linear-gradient(135deg,#ef4444,#dc2626)}',
        '.stat-violet{background:linear-gradient(135deg,#8b5cf6,#6d28d9)}',
        '.stat-slate{background:linear-gradient(135deg,#64748b,#475569)}',
        '.stat-label{font-size:12px;opacity:.85;font-weight:500}',
        '.stat-val{font-size:20px;font-weight:700;margin:3px 0;line-height:1.2}',
        '.stat-val span{font-size:12px;font-weight:400;opacity:.85;margin-left:2px}',
        '.stat-sub{font-size:12px;opacity:.9}'
      ].join("\n");
      if(document.head) document.head.appendChild(st);
      else document.documentElement.appendChild(st);
    }
  }
})();

// ================== 用户与登录 ==================
const USERS_KEY = "coalUsers";
const SESSION_KEY = "coalSession";

// 场地清单（用于登录/新增用户/显示）
const SITES = ["西华煤场","禹州煤场","告成煤场","叶县煤场"];
// 旧场地名 → 新场地名（迁移用：旧数据 key 与用户 site 自动改名，避免数据丢失）
const SITE_MAP = { "总场":"西华煤场", "场地A":"禹州煤场", "场地B":"告成煤场", "场地C":"叶县煤场" };

// 场地改名迁移：旧 key 数据 → 新 key；用户表与当前会话 site 同步改名
function migrateSites(){
  Object.keys(SITE_MAP).forEach(old=>{
    const ok="coalData_"+old, nk="coalData_"+SITE_MAP[old];
    const raw=localStorage.getItem(ok);
    if(raw && !localStorage.getItem(nk)){ localStorage.setItem(nk, raw); localStorage.removeItem(ok); }
  });
  const users=loadUsers(); let changed=false;
  users.forEach(u=>{ if(u.site && SITE_MAP[u.site]){ u.site=SITE_MAP[u.site]; changed=true; } });
  if(changed) saveUsers(users);
  const sess=currentUser();
  if(sess && sess.site && SITE_MAP[sess.site]){ sess.site=SITE_MAP[sess.site]; localStorage.setItem(SESSION_KEY, JSON.stringify(sess)); }
}

// 模块清单：key 用于权限，label 用于导航与用户管理
const MODULES = [
  { key:"purchase", label:"采购" },
  { key:"inventory",label:"库存" },
  { key:"mix",      label:"场地配煤" },
  { key:"sale",     label:"销售出库" },
  { key:"finance",  label:"财务管理" },
  { key:"export",   label:"数据导出" }
];

// 默认权限：admin 全模块可编辑
function defaultPerms(){
  const p = {};
  MODULES.forEach(m=> p[m.key] = "edit"); // 无 / read / edit
  return p;
}

// 默认管理员账号（携带完整权限，场地为"西华煤场"）
function defaultUsers(){
  return [{ username:"丁浩伦", password:"123456", role:"admin", name:"丁浩伦", site:"西华煤场", perms:defaultPerms() }];
}
function loadUsers(){
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if(!raw) return defaultUsers();
    const u = JSON.parse(raw);
    if(!Array.isArray(u) || !u.length) return defaultUsers();
    // 兼容旧数据：补充 perms / site 字段
    let ch=false;
    u.forEach(x=>{
      if(!x.perms){ x.perms = x.role==="admin" ? defaultPerms() : {}; }
      if(!x.site){ x.site = "西华煤场"; }
      // 管理员账号改名/改密：admin → 丁浩伦 / 123456
      if(x.role==="admin"){
        if(x.username==="admin"){ x.username="丁浩伦"; ch=true; }
        if(x.name!=="丁浩伦"){ x.name="丁浩伦"; ch=true; }
        if(x.password!=="123456"){ x.password="123456"; ch=true; }
      }
    });
    if(ch) saveUsers(u);
    // 当前会话若为旧 admin，同步改名（避免用户条仍显示旧名）
    const sess=currentUser();
    if(sess && sess.role==="admin" && sess.username==="admin"){
      sess.username="丁浩伦"; sess.name="丁浩伦";
      localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    }
    return u;
  } catch(e){ return defaultUsers(); }
}
function saveUsers(list){ localStorage.setItem(USERS_KEY, JSON.stringify(list)); cloudPushUsers(list); }

// 权限判断：module 权限级别，返回 "edit"|"read"|"" (无)
function userPerm(user, moduleKey){
  if(!user) return "";
  if(user.role === "admin") return "edit";
  const p = user.perms || {};
  return p[moduleKey] || "";
}
function canAccess(moduleKey){
  return userPerm(currentUser(), moduleKey) !== "";
}
function canEdit(moduleKey){
  return userPerm(currentUser(), moduleKey) === "edit";
}
// 删除仍限管理员
function isAdmin(){ const u=currentUser(); return !!u && u.role==="admin"; }
function canDelete(){ return isAdmin(); }

// 当前登录会话
function currentUser(){
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e){ return null; }
}
function requireLogin(){
  const u = currentUser();
  if(!u) { location.href = "login.html"; return null; }
  return u;
}
// 当前场地：管理员自由切换4场；普通用户只能在被管理员开放的煤场（sites）中切换，默认自己的煤场
function currentSite(){
  const u = currentUser();
  const valid=["西华煤场","禹州煤场","告成煤场","叶县煤场"];
  const own = (u && u.site && valid.indexOf(u.site)>=0) ? u.site : "西华煤场";
  if(!u) return own;
  const ov = localStorage.getItem("coalViewSite");
  if(u.role==="admin"){
    return (ov && valid.indexOf(ov)>=0) ? ov : own;
  }
  const allowed = Array.isArray(u.sites) ? u.sites.filter(s=>valid.indexOf(s)>=0) : [own];
  if(allowed.indexOf(own)<0) allowed.unshift(own);
  return (ov && allowed.indexOf(ov)>=0) ? ov : own;
}

// 登出
function logout(){
  localStorage.removeItem(SESSION_KEY);
  location.href = "login.html";
}

// 渲染右上角用户信息条 + 权限（供各业务页调用）
function renderUserBar(){
  const user = currentUser();
  if(!user) return;
  const bar = document.getElementById("userbar");
  if(!bar) return;
  const sites = ["西华煤场","禹州煤场","告成煤场","叶县煤场"];
  const curSite = currentSite();
  let allowed;
  if(user.role==="admin") allowed = sites;
  else {
    allowed = (Array.isArray(user.sites)&&user.sites.length) ? user.sites.filter(s=>sites.indexOf(s)>=0) : [];
    if(allowed.indexOf(user.site||"西华煤场")<0) allowed.unshift(user.site||"西华煤场");
  }
  bar.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <select id="siteSwitcher" onchange="switchSite(this.value)" style="padding:5px 10px;border-radius:999px;background:#fff7e0;border:1px solid #e8c55c;color:#a67c00;font-size:13px;font-weight:600;cursor:pointer">
        ${sites.map(s=>`<option value="${s}" ${s===curSite?"selected":""} ${allowed.indexOf(s)<0?"disabled":""}>🏭 ${s}</option>`).join("")}
      </select>
      <span style="display:inline-flex;align-items:center;gap:6px;font-size:14px;color:#4a3a15;font-weight:600">${user.role==="admin"?"👑":"👤"} ${user.name||user.username}<span style="color:#b09a60;font-size:12px;font-weight:400">${user.role==="admin"?"管理员":"普通用户"}</span></span>
      ${user.role==="admin" ? `<a href="users.html" style="padding:6px 12px;border-radius:8px;background:#f7e7bd;color:#a67c00;font-size:13px;text-decoration:none;font-weight:600">用户管理</a>` : ""}
      <button onclick="logout()" style="padding:6px 14px;border-radius:8px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:13px;font-weight:600;border:none;cursor:pointer">退出</button>
    </div>`;
}
// 切换当前查看煤场（普通用户仅能在被管理员开放的煤场间切换，管理员自由切4场）
function switchSite(site){
  if(!site) return;
  localStorage.setItem("coalViewSite", site);
  location.reload();
}

// ===== 金额取整 =====
function roundInt(num){ return Math.round(num); }

// ===== Supabase 云同步（REST，原生 fetch，无额外依赖）=====
// 数据存云端 app_state / users 表；本地 localStorage 作为离线缓存兜底
var SUPABASE_URL = "https://fvyvtueusascxoffvpaf.supabase.co";
var SUPABASE_KEY = "sb_publishable_uKZTV9VfhxSTqJ7diLDz0w_LoTN5Vkm";
var _cloudHooks = []; // 云端数据就绪后要重新渲染的回调

// 页面注册：云端数据拉取完成后执行 fn（用于刷新当前页）
function onCloudReady(fn){ if(typeof fn==='function') _cloudHooks.push(fn); }
function fireCloudReady(){ _cloudHooks.forEach(function(fn){ try{ fn(); }catch(e){} }); }

// 发起 REST 请求，失败静默返回 null（不影响本地）
function _cfetch(path, opts){
  opts = opts || {};
  var h = { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" };
  for(var k in (opts.headers||{})) h[k] = opts.headers[k]; // 合并请求头，保留 apikey
  var cfg = { method: opts.method||"GET", headers: h };
  if(opts.body) cfg.body = opts.body;
  return fetch(SUPABASE_URL + "/rest/v1/" + path, cfg)
    .then(function(r){ return r.text().then(function(t){ try{ return JSON.parse(t); }catch(e){ return t; } }); })
    .catch(function(){ return null; });
}

// 当前场地业务数据 → 云端 upsert
function cloudPushAppState(){
  var site = currentSite(); if(!site) return;
  var payload = { purchaseList: purchaseList, saleList: saleList, coalMixRecordList: coalMixRecordList, stockStartTon: stockStartTon, stockStartMoney: stockStartMoney };
  return _cfetch("app_state", { method:"POST", headers:{ "Prefer":"resolution=merge-duplicates" }, body: JSON.stringify([{ site: site, payload: payload, updated_at: new Date().toISOString() }]) });
}
// 从云端拉取当前场地业务数据
function cloudPullAppState(){
  var site = currentSite(); if(!site) return Promise.resolve(null);
  return _cfetch("app_state?site=eq." + encodeURIComponent(site) + "&select=payload").then(function(rows){
    if(!Array.isArray(rows) || !rows.length) return null;
    return (rows[0] && rows[0].payload) || null;
  });
}
// 用户表 → 云端 upsert
function cloudPushUsers(list){
  var rows = list.map(function(u){ return { username: u.username, payload: u, updated_at: new Date().toISOString() }; });
  return _cfetch("users", { method:"POST", headers:{ "Prefer":"resolution=merge-duplicates" }, body: JSON.stringify(rows) });
}
// 从云端拉取全部用户
function cloudPullUsers(){
  return _cfetch("users?select=username,payload").then(function(rows){
    if(!Array.isArray(rows) || !rows.length) return null;
    return rows.map(function(r){ return r.payload; });
  });
}

// ==== localStorage 业务数据持久化（按场地隔离）====
// 数据 key 按当前用户场地区分：coalData_<site>，同场地共享、不同场地互不可见
function dataKey(){
  return "coalData_" + currentSite();
}
function saveAllData(){
  const obj = { purchaseList, saleList, coalMixRecordList, stockStartTon, stockStartMoney };
  localStorage.setItem(dataKey(), JSON.stringify(obj));
  cloudPushAppState(); // 异步同步到云端（file:// 下 CORS 可能失败，静默不影响本地）
}
function loadAllData(){
  migrateSites();
  const str = localStorage.getItem(dataKey());
  // 无数据或读取失败：清空，避免残留上一场地/上次数据
  purchaseList = []; saleList = []; coalMixRecordList = []; stockStartTon = 0; stockStartMoney = 0;
  if(!str) return _pullCloud();
  try {
    const obj = JSON.parse(str);
    purchaseList = obj.purchaseList || [];
    saleList = obj.saleList || [];
    coalMixRecordList = obj.coalMixRecordList || [];
    stockStartTon = obj.stockStartTon || 0;
    stockStartMoney = obj.stockStartMoney || 0;
  } catch(e){ console.warn("数据读取失败", e); }
  // 加载后按原料当前单价同步配煤成品成本（原料单价被修改后自动跟随）
  recalcMixCosts(true);
  _pullCloud();
}
// 从云端拉取当前场地数据，覆盖本地并触发页面重渲染（供多设备同步）
function _pullCloud(){
  cloudPullAppState().then(function(obj){
    if(!obj){
      // 云端无数据：若本地有数据，首次自动推送到云端（完成本地历史数据迁移）
      if(purchaseList.length || saleList.length || coalMixRecordList.length || stockStartTon || stockStartMoney) cloudPushAppState();
      return;
    }
    purchaseList = obj.purchaseList || []; saleList = obj.saleList || [];
    coalMixRecordList = obj.coalMixRecordList || []; stockStartTon = obj.stockStartTon || 0; stockStartMoney = obj.stockStartMoney || 0;
    try{ localStorage.setItem(dataKey(), JSON.stringify({ purchaseList, saleList, coalMixRecordList, stockStartTon, stockStartMoney })); }catch(e){}
    recalcMixCosts(true);
    fireCloudReady();
  });
}

// 按多级策略找到配煤原料对应的当前采购批次（单号→矿点+吨位→矿点有库存）
function findSrcForMix(s){
  const rec = s && s.source; if(!rec) return null;
  if(rec.no){ const f=purchaseList.filter(p=>p.no===rec.no); if(f.length) return f[0]; }
  const bySame=purchaseList.filter(p=>p.from===rec.from && p.from && Math.abs((p.settle||0)-(rec.settle||0))<0.001);
  if(bySame.length) return bySame[0];
  const byFrom=purchaseList.filter(p=>p.from===rec.from && p.from && ((p.stockRemain ?? p.settle)>0));
  if(byFrom.length) return byFrom[0];
  return null;
}
// 重算配煤成品成本：修改原料采购单价后，追溯更新所有用该原料配煤的成品成本/单价
var recalcDiag = []; // 诊断：每次重算时记录各配煤方案原料匹配明细
function recalcMixCosts(doSave){
  if(!Array.isArray(coalMixRecordList)) return;
  recalcDiag = [];
  let changed=false;
  coalMixRecordList.forEach((it,i)=>{
    if(!it || !Array.isArray(it.sourceList) || !it.sourceList.length) return;
    let cost=0, missing=false, diagItems=[];
    it.sourceList.forEach(s=>{
      const src=findSrcForMix(s);
      if(!src){ missing=true; diagItems.push({from:(s.source&&s.source.from)||'', no:(s.source&&s.source.no)||'', useTon:s.useTon, matched:'未匹配到原料', unit:null}); return; }
      cost += ((src.totalCostAll||0)/((src.settle||1))) * (s.useTon||0);
      diagItems.push({from:(s.source&&s.source.from)||'', no:(s.source&&s.source.no)||'', useTon:s.useTon, matched:'匹配到 '+src.from+'('+src.no+')', unit:((src.totalCostAll||0)/((src.settle||1))).toFixed(2)});
    });
    if(missing){
      recalcDiag.push({i:i+1, outNo:it.outNo||'', items:diagItems, cost:'原料缺失，未更新', target:''});
      return; // 原料批次缺失，保持该成品原值，避免误覆盖
    }
    cost=roundInt(cost);
    // 优先用方案记录的 outNo 匹配成品；无 outNo 时按配煤方案顺序与 MIX 成品顺序对应
    let target = it.outNo ? purchaseList.filter(p=>p.no===it.outNo)[0] : null;
    if(!target){
      let cnt=0;
      purchaseList.forEach(p=>{
        if((p.no||"").indexOf("MIX-")===0){ if(cnt===i) target=p; cnt++; }
      });
    }
    if(target){
      const changedNow = (target.totalCostAll!==cost);
      target.totalCostAll=cost;
      target.tonCostAll= target.settle>0 ? cost/target.settle : 0;
      // 配煤成品只入库存，财务煤款记0（不产生煤款应付）
      target.coalUnitPrice=0;
      target.coalTotalMoney=0;
      target.coalPaidMoney=0;
      if(changedNow) changed=true;
      recalcDiag.push({i:i+1, outNo:it.outNo||'', items:diagItems, cost:cost+' 元', target:target.from+'('+target.no+') 单价→'+target.tonCostAll.toFixed(2)});
    } else {
      recalcDiag.push({i:i+1, outNo:it.outNo||'', items:diagItems, cost:cost+' 元', target:'未找到对应配煤成品'});
    }
  });
  if(changed && doSave!==false) saveAllData();
}

// ==== 库存计算 ====
// 统计每个采购批次作为原料被配煤消耗的吨数（按单号，回退矿点名）
function calcMixUsed(){
  const map={};
  coalMixRecordList.forEach(it=>{
    if(!it || !Array.isArray(it.sourceList)) return;
    it.sourceList.forEach(s=>{
      const src=s && s.source; if(!src) return;
      const key = src.no ? src.no : (src.from ? 'F:'+src.from : null);
      if(key) map[key]=(map[key]||0)+(s.useTon||0);
    });
  });
  return map;
}
function calcStock(){
  let remainTon = stockStartTon;
  let remainMoney = stockStartMoney;
  let totalInTon = 0, totalInMoney = 0, totalOutTon = 0;
  purchaseList.forEach(p=>{
    totalInTon += p.settle;
    totalInMoney += p.totalCostAll;
    const st = p.stockRemain ?? p.settle;
    remainTon += st;
    if(st>0 && p.tonCostAll) remainMoney += roundInt(st * p.tonCostAll);
  });
  saleList.forEach(s=>{
    totalOutTon += s.saleWeight;
  });
  const avgCostPrice = remainTon > 0 ? remainMoney / remainTon : 0;
  return { totalInTon, totalInMoney, totalOutTon, stockRemainTon: remainTon, stockRemainMoney: remainMoney, avgCostPrice };
}

// ==== 财务汇总 ====
function calcFinance(){
  let coalNeed=0, coalPaid=0, freightNeed=0, freightPaid=0, taxSum=0, brokerNeed=0, brokerPaid=0;
  purchaseList.forEach(p=>{
    coalNeed += p.coalTotalMoney;       coalPaid += p.coalPaidMoney||0;
    freightNeed += p.freightTotal;      freightPaid += p.freightPaidMoney||0;
    taxSum += p.taxAmount||0;
    brokerNeed += p.brokerAmount;       brokerPaid += p.brokerPaidMoney||0;
  });
  return {
    coalNeed, coalPaid, coalArrears: coalNeed - coalPaid,
    freightNeed, freightPaid, freightArrears: freightNeed - freightPaid,
    brokerNeed, brokerPaid, brokerArrears: brokerNeed - brokerPaid,
    taxSum
  };
}

// ==== 页面导航（按权限过滤）====
function renderNav(active){
  const nav = document.getElementById("nav");
  const me = currentUser();
  // [标签, 主色, 亮色, 暗色, 未选中浅色] —— 每个功能项独立配色，立体感更强
  const map = {
    "index.html":["📊 总览看板","#d4af37","#f7d98b","#9a740f","#faf3dc"],
    "purchase.html":["🛒 采购","#34a853","#7ee08a","#1e7d34","#e7f5ea"],
    "inventory.html":["📦 库存","#1e90ff","#6cc4ff","#1466b8","#e6f2fd"],
    "mix.html":["⚗️ 场地配煤","#8a5cf6","#c39bff","#5b3bc4","#f1ecfc"],
    "sale.html":["📤 销售出库","#ff7a2f","#ffb07a","#c9541a","#fdeee2"],
    "finance.html":["💰 财务管理","#0fa983","#5adfc0","#0a7a5c","#e5f6f0"],
    "export.html":["📥 数据导出","#4a6cf7","#7d9bff","#3450c9","#e8edfd"]
  };
  // 模块 key 与页面文件名对应
  const pageModule = { "purchase.html":"purchase","inventory.html":"inventory","sale.html":"sale","mix.html":"mix","finance.html":"finance","export.html":"export" };
  const pills = Object.keys(map).map(href=>{
    const mod = pageModule[href];
    if(mod && !canAccess(mod)) return ""; // 无权限的模块不显示
    const label = map[href][0], main=map[href][1], light=map[href][2], dark=map[href][3];
    const on = href === active;
    const onBg = `linear-gradient(180deg,${light},${main} 45%,${dark})`; // 选中：浅→深强渐变，立体凸起
    const offBg = `linear-gradient(180deg,${light},${main} 58%,${dark})`; // 未选中：浅→深渐变
    const onShadow = `inset 0 3px 0 rgba(255,255,255,.95), inset 0 -4px 0 rgba(0,0,0,.32), 0 8px 16px ${main}66`;
    const offShadow = "inset 0 2px 0 rgba(255,255,255,.55), inset 0 -3px 0 rgba(0,0,0,.26), 0 4px 9px rgba(0,0,0,.22)";
    const color = "#ffffff";
    const textShadow = on ? "0 1px 2px rgba(0,0,0,.5)" : "0 1px 2px rgba(0,0,0,.4)";
    return `<a href="${href}" style="display:inline-block;padding:10px 16px;margin:0 3px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:700;background:${on?onBg:offBg};color:${color};text-shadow:${textShadow};box-shadow:${on?onShadow:offShadow};transition:all .18s;" onmouseover="this.style.background='${onBg}';this.style.color='#ffffff';this.style.textShadow='0 1px 1px rgba(0,0,0,.25)'" onmouseout="this.style.background='${on?onBg:offBg}';this.style.color='${color}';this.style.textShadow='${textShadow}'">${label}</a>`;
  }).join("");
  nav.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;background:linear-gradient(180deg,#ffffff,#fbf3de);padding:11px;border-radius:16px;border:1px solid rgba(201,154,46,.30);box-shadow:0 2px 4px rgba(90,60,10,.08),inset 0 1px 0 rgba(255,255,255,.9),0 12px 28px rgba(90,60,10,.16)">${pills}</div>`;
}

// 页面统一初始化：校验登录 + 模块权限 + 渲染用户条 + 导航
function initPage(active){
  migrateSites();
  requireLogin();
  // 模块级访问控制
  const mod = { "purchase.html":"purchase","sale.html":"sale","mix.html":"mix","finance.html":"finance","export.html":"export" }[active];
  if(mod && !canAccess(mod)){
    alert("您没有访问该模块的权限");
    location.href = "index.html";
    return;
  }
  renderUserBar();
  renderNav(active);
}

// ===== PWA 离线安装支持（让 Chrome 出现"安装应用"按钮，可添加到桌面）=====
(function(){
  if(typeof navigator!=="undefined" && 'serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(function(err){ console.warn("SW注册失败", err); });
  }
})();

// ===== 一键"安装到手机桌面"悬浮按钮（移动端常驻显示，点击智能安装或引导）=====
(function(){
  if(typeof window==="undefined") return;
  var installPrompt=null;
  function isMobile(){
    return /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent||"");
  }
  function showGuide(){
    try{ alert("如未弹出安装，请用手机浏览器（Chrome）右上角菜单点\u201c安装应用\u201d或\u201c添加到主屏幕\u201d。"); }catch(e){}
  }
  function showInstall(){
    if(document.getElementById("coalInstallBtn")) return;
    var btn=document.createElement("div");
    btn.id="coalInstallBtn";
    btn.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg><span>安装到手机桌面</span>';
    btn.style.cssText='position:fixed;right:14px;bottom:84px;z-index:99999;display:flex;align-items:center;gap:8px;padding:12px 18px;border-radius:999px;cursor:pointer;font-size:14px;font-weight:600;color:#1a1408;background:linear-gradient(135deg,#f7d98b,#d4af37 55%,#b18a1f);box-shadow:0 10px 30px rgba(177,138,31,.5);border:1px solid rgba(255,255,255,.5);font-family:inherit';
    btn.onclick=function(){
      if(installPrompt){
        installPrompt.prompt();
        installPrompt.userChoice.then(function(res){ if(res && res.outcome==="accepted") hideInstall(); }).catch(function(){});
      } else { showGuide(); }
    };
    document.body.appendChild(btn);
  }
  function hideInstall(){
    var b=document.getElementById("coalInstallBtn");
    if(b) b.remove();
    installPrompt=null;
  }
  function tryShow(){ if(isMobile()) showInstall(); }
  window.addEventListener('DOMContentLoaded', tryShow);
  if(document.readyState==='complete'||document.readyState==='interactive'){ setTimeout(tryShow, 300); }
  window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); installPrompt=e; });
  window.addEventListener('appinstalled', function(){ hideInstall(); });
})();

// ===== 立体水晶按钮效果（顶部高光 + 底部暗边 + 立体投影 + 按压下沉）=====
(function(){
  if(typeof window==="undefined" || !document) return;
  function isDanger(btn){
    var t=(btn.textContent||"").trim();
    return /删除|移除|取消|清空|作废|关闭/.test(t);
  }
  function apply(btn){
    if(btn.__btn3d) return;
    btn.__btn3d=true;
    var st=btn.style;
    // 颜色由浅入深：读取按钮当前底色，生成"顶部浅→中部主色→底部深"渐变立体
    try{
      var cs=getComputedStyle(btn);
      var rgb=cs.backgroundColor||"";
      var m=rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      var solid = rgb && !/^rgba\(0, ?0, ?0, ?0\)/.test(rgb);
      if(m && solid){
        var r=+m[1],g=+m[2],b=+m[3];
        var lr=Math.min(255,r+80),lg=Math.min(255,g+80),lb=Math.min(255,b+80);
        var dr=Math.max(0,r-75),dg=Math.max(0,g-75),db=Math.max(0,b-75);
        st.background='linear-gradient(180deg, rgb('+lr+','+lg+','+lb+'), rgb('+r+','+g+','+b+') 52%, rgb('+dr+','+dg+','+db+'))';
      }
    }catch(e){}
    st.boxShadow='inset 0 3px 0 rgba(255,255,255,.95), inset 0 -1px 0 rgba(255,255,255,.30), inset 0 -4px 0 rgba(0,0,0,.30), inset 0 -8px 14px rgba(0,0,0,.22), 0 8px 22px rgba(0,0,0,.34)';
    st.border='1px solid rgba(255,255,255,.38)';
    st.borderRadius='12px';
    st.transition='box-shadow .08s, transform .06s';
    st.cursor='pointer';
    var pressed='inset 0 4px 10px rgba(0,0,0,.30), 0 1px 3px rgba(0,0,0,.15)';
    var normal='inset 0 3px 0 rgba(255,255,255,.95), inset 0 -1px 0 rgba(255,255,255,.30), inset 0 -4px 0 rgba(0,0,0,.30), inset 0 -8px 14px rgba(0,0,0,.22), 0 8px 22px rgba(0,0,0,.34)';
    btn.addEventListener('pointerdown', function(){ st.boxShadow=pressed; st.transform='translateY(1px)'; });
    var restore=function(){ st.boxShadow=normal; st.transform=''; };
    btn.addEventListener('pointerup', restore);
    btn.addEventListener('pointerleave', restore);
  }
  function scan(){
    document.querySelectorAll('button').forEach(function(b){
      if(isDanger(b)) return;
      apply(b);
    });
  }
  if(document.readyState==='loading'){ window.addEventListener('DOMContentLoaded', scan); }
  else { scan(); }
  // 用 MutationObserver 覆盖表格/表单动态渲染的按钮，实时立体化
  try {
    var mo = new MutationObserver(function(){ scan(); });
    if(document.body) mo.observe(document.body, {childList:true, subtree:true});
  } catch(e) {}
})();
