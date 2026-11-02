"use strict";

const categories = {
  photo: {label:"사진과 글", number:"01", tone:"#e1e5d9", ink:"#77816b", accent:"#899a72", description:"사진 한 장과 문장에 담아낸 여행의 순간입니다. 사진과 글의 배치를 유지해 작품 전체를 감상하는 화면으로 구성됩니다.", pages:1, icon:'<rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="8" cy="9" r="1.5"/><path d="m4 18 5-5 4 4 3-3 5 5"/>'},
  poem: {label:"시화", number:"02", tone:"#eae3d7", ink:"#938674", accent:"#b19a7d", description:"여행에서 떠오른 감정을 시와 그림으로 표현한 기록입니다. 글과 그림이 어우러진 한 지면을 크게 감상할 수 있습니다.", pages:1, icon:'<path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h4"/>'},
  music: {label:"음악", number:"03", tone:"#dce4df", ink:"#748a7b", accent:"#7d9a88", description:"눈에 담았던 풍경을 소리로 풀어낸 작품입니다. 실제 작품이 연결되면 이 공간에서 음악과 작품 설명을 함께 감상할 수 있습니다.", pages:1, icon:'<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>'},
  art: {label:"그림·만화", number:"04", tone:"#e8ddd5", ink:"#9b8778", accent:"#b69781", description:"선과 색으로 다시 그려본 여행의 한 장면입니다. 여러 장으로 구성된 작품은 아래의 페이지 버튼으로 넘겨볼 수 있습니다.", pages:2, icon:'<path d="m5 19 1-5L17 3l4 4L10 18zM14 6l4 4M4 21h17"/>'},
  card: {label:"카드뉴스", number:"05", tone:"#dfe4e5", ink:"#7c8b8e", accent:"#849ca1", description:"여행 중 발견하고 배운 내용을 차근차근 펼쳐낸 기록입니다. 페이지 넘기기로 카드뉴스를 순서대로 감상할 수 있습니다.", pages:3, icon:'<rect x="3" y="6" width="14" height="15" rx="1"/><path d="M7 3h14v15M6 10h8M6 14h8M6 18h5"/>'},
  video: {label:"숏폼 영상", number:"06", tone:"#e4dfd8", ink:"#8e8477", accent:"#ad9c86", description:"움직이는 장면과 소리로 함께하는 짧은 여행입니다. 실제 영상이 연결되면 세로 화면의 비율을 유지하며 감상할 수 있습니다.", pages:1, icon:'<rect x="6" y="2" width="12" height="20" rx="1.5"/><path d="m10 9 5 3-5 3z"/>'}
};

// Illustrative records only. No student submissions are fetched or embedded.
const titles = [
  ["도시의 밤을 걷다", "낯선 길에서 발견한 것", "사진 한 장에 담은 여행"],
  ["여행이 남긴 문장", "그곳의 바람", "아직 끝나지 않은 길"],
  ["우리의 여행, 하나의 선율", "발걸음의 리듬", "다시 떠오르는 순간"],
  ["내가 그린 여행", "여행의 한 컷", "작은 발견의 순간들"],
  ["새로운 시선으로 읽는 도시", "여행 속 과학 이야기", "여섯 장으로 남긴 기록"],
  ["30초, 우리의 여행", "함께 걸었던 거리", "다시 만나는 그날"]
];
const categoryKeys = Object.keys(categories);
const artworks = Array.from({length:18}, (_,i) => ({id:`work-${String(i+1).padStart(2,"0")}`, category:categoryKeys[i%6], title:titles[i%6][Math.floor(i/6)], student:String(1101+i), author:`학생 ${String(i+1).padStart(2,"0")}`, index:i+1}));
const state = {category:"all", query:"", sort:"student", selected:null, page:1};
const grid = document.querySelector("#artwork-grid");
const dialog = document.querySelector("#artwork-dialog");
const searchInput = document.querySelector("#search");
let returnFocus = null;
let restoring = false;

function icon(category) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${categories[category].icon}</svg>`;
}
function filteredArtworks() {
  const query = state.query.trim().toLocaleLowerCase("ko").normalize("NFC");
  return artworks.filter(work => (state.category === "all" || work.category === state.category)
    && `${work.title} ${work.student} ${work.author} ${categories[work.category].label}`.normalize("NFC").toLocaleLowerCase("ko").includes(query))
    .sort((a,b) => state.sort === "title" ? a.title.localeCompare(b.title,"ko") : a.student.localeCompare(b.student));
}
function render() {
  const filtered = filteredArtworks();
  document.querySelectorAll(".category-button").forEach(button => {
    const active = button.dataset.category === state.category;
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",String(active));
    button.querySelector(".category-count").textContent = button.dataset.category === "all" ? artworks.length : artworks.filter(work => work.category === button.dataset.category).length;
  });
  document.querySelector("#collection-name").textContent = state.category === "all" ? "전체 작품" : categories[state.category].label;
  document.querySelector("#result-count").textContent = `예시 ${filtered.length}점${state.query.trim() ? " · 검색 결과" : ""}`;
  grid.innerHTML = filtered.map(work => {
    const cat = categories[work.category];
    return `<article class="artwork-card" style="--tone:${cat.tone};--tone-ink:${cat.ink};--accent:${cat.accent}"><button type="button" class="artwork-open" data-work="${work.id}" aria-haspopup="dialog" aria-label="예시 작품 ${work.title}, ${work.student} ${work.author} 열기"><div class="artwork-placeholder"><span class="placeholder-index">${String(work.index).padStart(2,"0")} / RECORD</span><span class="open-indicator" aria-hidden="true">↗</span><div class="placeholder-center">${icon(work.category)}<span>${cat.label}</span></div><div class="placeholder-bottom"><span>작품이 전시될 자리</span><span>PLACEHOLDER</span></div></div><div class="artwork-meta"><div class="artwork-category">${cat.label}</div><h4 class="artwork-title"><span>${work.title}</span><span>예시</span></h4><p class="artwork-author">${work.student}<span aria-hidden="true"></span>${work.author}</p></div></button></article>`;
  }).join("");
  document.querySelector("#empty-state").hidden = filtered.length !== 0;
  document.querySelector("#collection-end-text").textContent = filtered.length ? `${filtered.length}개의 예시 기록을 모두 둘러보았어요.` : "다른 기록을 찾아보세요.";
}
function syncUrl() {
  if (restoring || location.protocol === "file:") return;
  const params = new URLSearchParams();
  if (state.category !== "all") params.set("type",state.category);
  if (state.selected) params.set("work",state.selected);
  if (state.query.trim()) params.set("q",state.query.trim());
  if (state.sort !== "student") params.set("sort",state.sort);
  history.replaceState(null,"",`${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`);
}
function showWork(id, updateUrl = true) {
  const work = artworks.find(item => item.id === id);
  if (!work) return;
  if (!dialog.open) returnFocus = document.activeElement;
  state.selected = id;
  state.page = 1;
  const cat = categories[work.category];
  document.querySelector("#dialog-category").textContent = `${cat.number} — ${cat.label}`;
  document.querySelector("#dialog-title").textContent = work.title;
  document.querySelector("#dialog-author").textContent = `${work.student}  ·  ${work.author} (예시)`;
  document.querySelector("#dialog-description").textContent = cat.description;
  document.querySelector("#detail-category").textContent = cat.label;
  document.querySelector("#detail-author").textContent = `${work.student} ${work.author} (예시)`;
  const viewer = document.querySelector("#viewer-placeholder");
  viewer.style.setProperty("--tone",cat.tone);
  viewer.style.setProperty("--tone-ink",cat.ink);
  viewer.dataset.type = work.category;
  document.querySelector("#viewer-type").textContent = cat.label;
  document.querySelector("#viewer-caption").textContent = work.category === "music" ? "음악 작품이 재생될 자리" : work.category === "video" ? "영상 작품이 재생될 자리" : "작품이 전시될 자리";
  document.querySelector("#page-controls").hidden = cat.pages === 1;
  renderPage();
  renderWorkNavigation();
  if (!dialog.open) { dialog.showModal(); document.body.classList.add("dialog-open"); }
  dialog.scrollTop = 0;
  if (updateUrl) syncUrl();
}
function renderPage() {
  const work = artworks.find(item => item.id === state.selected);
  if (!work) return;
  const cat = categories[work.category];
  document.querySelector("#viewer-corner").textContent = `RECORD ${String(work.index).padStart(2,"0")}${cat.pages > 1 ? ` · PAGE ${String(state.page).padStart(2,"0")}` : ""}`;
  document.querySelector("#page-count").textContent = `${state.page} / ${cat.pages}`;
  document.querySelector("#previous-page").disabled = state.page === 1;
  document.querySelector("#next-page").disabled = state.page === cat.pages;
}
function renderWorkNavigation() {
  const filtered = filteredArtworks();
  const index = filtered.findIndex(work => work.id === state.selected);
  document.querySelector("#artwork-position").textContent = index >= 0 ? `${String(index+1).padStart(2,"0")} / ${String(filtered.length).padStart(2,"0")}` : "예시 작품";
  document.querySelector("#previous-artwork").disabled = index <= 0;
  document.querySelector("#next-artwork").disabled = index < 0 || index >= filtered.length-1;
}
function moveWork(direction) {
  const filtered = filteredArtworks();
  const index = filtered.findIndex(work => work.id === state.selected);
  if (index >= 0 && filtered[index+direction]) showWork(filtered[index+direction].id);
}
document.querySelectorAll(".category-button").forEach(button => button.addEventListener("click",() => {state.category=button.dataset.category;render();syncUrl();}));
searchInput.addEventListener("input",() => {state.query=searchInput.value;render();syncUrl();});
document.querySelector("#sort").addEventListener("change",event => {state.sort=event.target.value;render();syncUrl();});
document.querySelector("#reset-search").addEventListener("click",() => {state.query="";state.category="all";searchInput.value="";render();syncUrl();searchInput.focus();});
grid.addEventListener("click",event => {const button=event.target.closest("[data-work]");if(button) showWork(button.dataset.work);});
document.querySelector("#close-dialog").addEventListener("click",() => dialog.close());
dialog.addEventListener("click",event => {if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom) dialog.close();}});
dialog.addEventListener("close",() => {if(dialog.open)return;document.body.classList.remove("dialog-open");state.selected=null;syncUrl();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
document.querySelector("#previous-artwork").addEventListener("click",() => moveWork(-1));
document.querySelector("#next-artwork").addEventListener("click",() => moveWork(1));
document.querySelector("#previous-page").addEventListener("click",() => {if(state.page>1){state.page--;renderPage();}});
document.querySelector("#next-page").addEventListener("click",() => {const work=artworks.find(item=>item.id===state.selected);if(work&&state.page<categories[work.category].pages){state.page++;renderPage();}});
dialog.addEventListener("keydown",event => {if(event.key==="ArrowLeft"){event.preventDefault();moveWork(-1);}else if(event.key==="ArrowRight"){event.preventDefault();moveWork(1);}});
function restoreUrl() {
  restoring=true;
  const params = new URLSearchParams(location.search);
  state.category = Object.hasOwn(categories,params.get("type")) ? params.get("type") : "all";
  state.query = params.get("q") || "";
  state.sort = params.get("sort") === "title" ? "title" : "student";
  searchInput.value=state.query;
  document.querySelector("#sort").value=state.sort;
  render();
  const initial = params.get("work");
  if (artworks.some(work=>work.id===initial)) showWork(initial,false);
  else if(dialog.open) dialog.close();
  restoring=false;
}
restoreUrl();
window.addEventListener("popstate",restoreUrl);
