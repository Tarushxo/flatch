import { PHOTO_QUALITY, PHOTO_SIZES, PHOTO_WIDTHS } from "../photo";

/*
 * The head start. The app's code takes a moment to download, and until now
 * nothing could be asked of the server before it had: first the code, then
 * "who is this?", then "which flats?", and only then the first photo. This
 * small script is written into the page itself, so it runs the instant the
 * page arrives. It asks one question that covers both ("who is this, and what
 * is on top of their deck?") and starts fetching the first photo as soon as it
 * has the answer, all while the app's code is still on its way. The app picks
 * the answer up from `window.__flatchStart` (see early.ts).
 *
 * It cannot import anything, so the photo sizing from lib/photo.ts is written
 * out again here in plain script. early-script.test.ts runs both and fails if
 * they ever disagree: a mismatch would make the browser fetch the photo twice.
 */

/** `photoSrcSet(url, "card")`, as a script the page can run on its own. */
export const SRCSET_SOURCE = String.raw`function srcset(url){
return ${JSON.stringify(PHOTO_WIDTHS.card)}.map(function(w){
var out=url;
try{
var u=new URL(url);
if(u.hostname==="res.cloudinary.com"){
var at=u.pathname.indexOf("/image/upload/");
if(at!==-1){
var cut=at+14;
u.pathname=u.pathname.slice(0,cut)+"f_auto,q_auto,c_limit,w_"+w+"/"+u.pathname.slice(cut).replace(/^(?:[a-z]+_[^/]+\/)*(?=v\d+\/)/,"");
}
out=u.toString();
}else if(u.hostname==="images.unsplash.com"){
u.searchParams.set("auto","format");
u.searchParams.set("fit","crop");
u.searchParams.set("w",String(w));
u.searchParams.set("q",${JSON.stringify(PHOTO_QUALITY)});
out=u.toString();
}
}catch(e){}
return out+" "+w+"w";
}).join(", ");
}`;

/** The whole script, ready to be written into the page. */
export function earlyStartScript(): string {
  return `(function(){
try{
${SRCSET_SOURCE}
var deck=location.pathname==="/discover";
var ask="/api/v1/start"+(deck?"?deck=1"+(location.search.length>1?"&"+location.search.slice(1):""):"");
window.__flatchStart=fetch(ask,{credentials:"same-origin",headers:{accept:"application/json"}})
.then(function(r){return r.ok?r.json():null})
.then(function(d){
try{
var photo=d&&d.deck&&d.deck.page.items[0]&&d.deck.page.items[0].photos[0];
if(photo){
var link=document.createElement("link");
link.rel="preload";
link.as="image";
link.setAttribute("imagesrcset",srcset(photo.url));
link.setAttribute("imagesizes",${JSON.stringify(PHOTO_SIZES.deckCard)});
link.setAttribute("fetchpriority","high");
document.head.appendChild(link);
}
}catch(e){}
return d;
})
.catch(function(){return null});
}catch(e){}
})();`;
}
