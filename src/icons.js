// UI icon set (Lucide). Only the icons listed here end up in the bundle.
import {
  Globe, Type, Wifi, IndianRupee, ContactRound, MessageCircle, Mail, Phone, MessageSquareText,
  CalendarDays, Bitcoin, Share2, Link, Shapes, Palette, Image as ImageIcon, Frame, ScanLine,
  QrCode, Sparkles, Camera, FolderOpen, Sun, Moon, Download, Copy, Save, FileJson, X, Upload,
  Check, Trash2, Pencil, ShieldCheck, TriangleAlert, Heart, Zap, Package, Info, Wind, Eye,
  Grid2x2, Blend, ArrowUpRight, Video, VideoOff, CircleCheck, CircleAlert, ShieldAlert, FileUp,
  Archive, ImageUp, Undo2, Lock, ChevronRight, Layers, Store, ShoppingBag, Coffee, Music, Star,
  MapPin, Send, RefreshCw, Ticket, Gift, Smile, Rocket, WandSparkles, ClipboardCheck, SquareDashed,
  Search, ArrowRight,
} from 'lucide';

const ICONS = {
  globe: Globe, text: Type, wifi: Wifi, rupee: IndianRupee, contact: ContactRound, chat: MessageCircle,
  mail: Mail, phone: Phone, sms: MessageSquareText, calendar: CalendarDays, bitcoin: Bitcoin,
  share: Share2, link: Link, shapes: Shapes, palette: Palette, image: ImageIcon, frame: Frame,
  scan: ScanLine, qr: QrCode, sparkles: Sparkles, camera: Camera, folder: FolderOpen, sun: Sun,
  moon: Moon, download: Download, copy: Copy, save: Save, json: FileJson, x: X, upload: Upload,
  check: Check, trash: Trash2, pencil: Pencil, shield: ShieldCheck, alert: TriangleAlert,
  heart: Heart, zap: Zap, package: Package, info: Info, wind: Wind, eye: Eye, checker: Grid2x2,
  blend: Blend, open: ArrowUpRight, video: Video, videoOff: VideoOff, ok: CircleCheck,
  warn: CircleAlert, risk: ShieldAlert, fileUp: FileUp, archive: Archive, imageUp: ImageUp,
  undo: Undo2, lock: Lock, chevron: ChevronRight, layers: Layers, store: Store, bag: ShoppingBag,
  coffee: Coffee, music: Music, star: Star, pin: MapPin, send: Send, refresh: RefreshCw,
  ticket: Ticket, gift: Gift, smile: Smile, rocket: Rocket, wand: WandSparkles,
  clipboard: ClipboardCheck, dashed: SquareDashed,
  search: Search, arrowRight: ArrowRight,
};

const attrs = (o) => Object.entries(o).map(([k, v]) => `${k}="${v}"`).join(' ');

/** Raw inner markup of an icon (24x24 grid) – used to build logo badges too. */
export function iconInner(name) {
  const node = ICONS[name];
  if (!node) throw new Error(`Unknown icon: ${name}`);
  return node.map(([tag, a]) => `<${tag} ${attrs(a)}/>`).join('');
}

export function icon(name, size = 18) {
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconInner(name)}</svg>`;
}

/** Replace every <i data-i="name" data-size="18"> placeholder with an inline SVG. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('i[data-i]').forEach((el) => {
    const holder = document.createElement('template');
    holder.innerHTML = icon(el.dataset.i, Number(el.dataset.size) || 18);
    const svg = holder.content.firstElementChild;
    el.classList.forEach((c) => svg.classList.add(c));
    el.replaceWith(svg);
  });
}
