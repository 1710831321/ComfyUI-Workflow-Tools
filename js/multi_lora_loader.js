import { app } from "../../../scripts/app.js";

// 语言配置：将下面一行的 "en" 改成 "zh" 即可切换中文
const LANG = "zh";

const I18N = {
    en: { on_off: "On/Off", lora: "LoRA", strength: "Strength", note: "Note", del: "Del",
          trigger: "Trigger", trigger_ph: "(none)",
          select: "Select LoRA...", add: "＋ Add LoRA", note_ph: "Note...",
          prompt_strength: "Strength", prompt_note: "Note", prompt_trigger: "Trigger",
          root_dir: "— Root —" },
    zh: { on_off: "开关", lora: "LoRA", strength: "权重", note: "备注", del: "删除",
          trigger: "触发词", trigger_ph: "(无)",
          select: "选择 LoRA...", add: "＋ 添加 LoRA", note_ph: "备注...",
          prompt_strength: "权重", prompt_note: "备注", prompt_trigger: "触发词",
          root_dir: "— 根目录 —" },
};
const T = I18N[LANG] ?? I18N.en;


const ROW_H = 30;
const PAD = 10;          // 底板/整体距节点边界
const INNER_PAD = 4;     // 底板内：内容（开关/输入框/删除）距底板边缘的呼吸空间
const HEADER_H = 22;
const STRENGTH_W = 62;
const TOGGLE_W = 32;   // 给胶囊留足够宽度
const DEL_W = ROW_H;
const NOTE_RATIO = 0.28;
const DROPDOWN_ITEM_H = 24;
const DROPDOWN_MAX = 12;
const NODE_MIN_W = 500;
const GAP = 5;

// 胶囊尺寸：严格小于TOGGLE_W
const TOG_W = 28, TOG_H = 16;

function colWidths(totalW) {
    const avail = totalW - (PAD + INNER_PAD) * 2 - TOGGLE_W - STRENGTH_W - DEL_W - 5 * GAP;
    const noteW = Math.floor(avail * 0.20);
    const triggerW = Math.floor(avail * 0.20);
    return [TOGGLE_W, avail - noteW - triggerW, STRENGTH_W, triggerW, noteW, DEL_W];
}

class DomDropdown {
    constructor() {
        this.el = document.createElement("div");
        Object.assign(this.el.style, {
            position: "fixed", zIndex: "99999", background: "#1c1c1c",
            border: "1px solid #4a8a4a", borderRadius: "6px", overflowY: "auto",
            boxShadow: "0 6px 20px rgba(0,0,0,0.8)", display: "none",
            maxHeight: `${DROPDOWN_MAX * DROPDOWN_ITEM_H}px`,
        });
        document.body.appendChild(this.el);
        this._onOutside = (e) => { if (!this.el.contains(e.target)) this.hide(); };
    }

    // Highlight the matching substring inside displayText (case-insensitive).
    _highlightMatch(displayText, filter) {
        const frag = document.createDocumentFragment();
        if (!filter) { frag.appendChild(document.createTextNode(displayText)); return frag; }
        const lower = displayText.toLowerCase();
        let idx = lower.indexOf(filter);
        if (idx < 0) { frag.appendChild(document.createTextNode(displayText)); return frag; }
        let cursor = 0;
        while (idx >= 0) {
            if (idx > cursor) frag.appendChild(document.createTextNode(displayText.substring(cursor, idx)));
            const mark = document.createElement("span");
            mark.textContent = displayText.substring(idx, idx + filter.length);
            mark.style.cssText = "color:#7ec8e3;font-weight:bold;background:#1a3a3a;border-radius:2px;";
            frag.appendChild(mark);
            cursor = idx + filter.length;
            idx = lower.indexOf(filter, cursor);
        }
        if (cursor < displayText.length) frag.appendChild(document.createTextNode(displayText.substring(cursor)));
        return frag;
    }

    show(items, selectedItem, anchorRect, onSelect) {
        this.el.innerHTML = "";
        this._activeIdx = -1;
        this._onSelect = onSelect;

        // Normalize selectedItem for consistent comparison
        const selectedNormalized = (selectedItem && selectedItem !== "None")
            ? selectedItem.replace(/\\/g, "/") : selectedItem;

        // Pre-build a normalized list: [{norm, orig, display}]
        const normalizedItems = [];
        for (const item of items) {
            if (item === "None") continue;
            const norm = item.replace(/\\/g, "/");
            const display = norm.replace(/\.(safetensors|pt|ckpt)$/i, "");
            normalizedItems.push({ norm: norm, orig: item, display: display });
        }

        // ===== Search bar (sticky at top) =====
        const searchWrap = document.createElement("div");
        searchWrap.style.cssText = "padding:6px 8px;border-bottom:1px solid #333;position:sticky;top:0;background:#1c1c1c;z-index:1;";
        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "搜索 LoRA...  (↑↓ 选择 / Enter 确认 / Esc 关闭)";
        searchInput.style.cssText = "width:100%;box-sizing:border-box;height:26px;background:#0e0e0e;color:#ddd;border:1px solid #4a8a4a;border-radius:4px;padding:0 8px;font-size:12px;outline:none;";
        searchWrap.appendChild(searchInput);
        this.el.appendChild(searchWrap);

        // Scrollable list container
        const listEl = document.createElement("div");
        this.el.appendChild(listEl);

        const rows = []; // [{path, el, orig}] for keyboard navigation
        this._rows = rows;

        // Build a row. selectable=true means it can be highlighted/activated by keyboard.
        const makeRow = (displayText, fullPathNormalized, origPath, indent, selectable) => {
            const div = document.createElement("div");
            div.dataset.path = fullPathNormalized;
            div.appendChild(this._highlightMatch(displayText, searchInput.value.trim().toLowerCase()));
            const padLeft = indent ? 28 + indent : 28;
            const isSelected = selectedNormalized === fullPathNormalized;
            div.style.cssText = `padding:5px 12px 5px ${padLeft}px;cursor:pointer;font-size:12px;` +
                `color:${isSelected ? "#7eb8f7" : "#bbb"};` +
                `background:${isSelected ? "#1a3a5a" : "transparent"};` +
                `white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
            div.addEventListener("mouseover", () => div.style.background = "#2a4a2a");
            div.addEventListener("mouseout", () => div.style.background = isSelected ? "#1a3a5a" : "transparent");
            div.addEventListener("mousedown", (e) => { e.stopPropagation(); onSelect(origPath); this.hide(); });
            if (selectable) rows.push({ path: fullPathNormalized, el: div, orig: origPath });
            return div;
        };

        // Render the list given a filter (already lowercased, "" = show all grouped)
        const renderList = (filter) => {
            listEl.innerHTML = "";
            rows.length = 0;
            this._activeIdx = -1;

            // ----- "None" row (always first) -----
            const noneDiv = document.createElement("div");
            noneDiv.textContent = "— None —";
            const noneSelected = selectedNormalized === "None";
            noneDiv.style.cssText = "padding:5px 12px;cursor:pointer;font-size:12px;" +
                `color:${noneSelected ? "#7eb8f7" : "#ccc"};` +
                `background:${noneSelected ? "#1a3a5a" : "transparent"};` +
                "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
            noneDiv.addEventListener("mouseover", () => noneDiv.style.background = "#2a4a2a");
            noneDiv.addEventListener("mouseout", () => noneDiv.style.background = noneSelected ? "#1a3a5a" : "transparent");
            noneDiv.addEventListener("mousedown", (e) => { e.stopPropagation(); onSelect("None"); this.hide(); });
            listEl.appendChild(noneDiv);
            rows.push({ path: "__none__", el: noneDiv, orig: "None" });

            if (!filter) {
                // ===== No filter: render grouped tree (original behavior) =====
                const rootFiles = [];
                const folderMap = new Map();
                for (const { norm } of normalizedItems) {
                    const idx = norm.lastIndexOf("/");
                    if (idx !== -1) {
                        const dir = norm.substring(0, idx);
                        const file = norm.substring(idx + 1);
                        if (!folderMap.has(dir)) folderMap.set(dir, []);
                        folderMap.get(dir).push(file);
                    } else {
                        rootFiles.push(norm);
                    }
                }
                rootFiles.sort();
                const sortedDirs = [...folderMap.keys()].sort();
                for (const dir of sortedDirs) folderMap.get(dir).sort();

                // Auto-expand the folder of the currently selected item
                const expandDirs = new Set();
                if (selectedNormalized && selectedNormalized !== "None") {
                    const si = selectedNormalized.lastIndexOf("/");
                    if (si !== -1) expandDirs.add(selectedNormalized.substring(0, si));
                }

                for (const dir of sortedDirs) {
                    const files = folderMap.get(dir);
                    const expanded = expandDirs.has(dir);

                    const header = document.createElement("div");
                    const arrowSpan = document.createElement("span");
                    arrowSpan.textContent = expanded ? "\u25BE " : "\u25B8 ";
                    arrowSpan.style.cssText = "display:inline-block;width:14px;text-align:center;";
                    header.appendChild(arrowSpan);
                    header.appendChild(document.createTextNode(dir + "/"));
                    Object.assign(header.style, {
                        padding: "5px 12px", cursor: "pointer", fontSize: "12px",
                        color: "#aaa", fontWeight: "bold",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                    });
                    header.addEventListener("mouseover", () => header.style.background = "#2a2a2a");
                    header.addEventListener("mouseout", () => header.style.background = "transparent");

                    const children = document.createElement("div");
                    children.style.display = expanded ? "block" : "none";

                    for (const file of files) {
                        const childNorm = dir + "/" + file;
                        const orig = normalizedItems.find(n => n.norm === childNorm)?.orig || childNorm;
                        const displayName = file.replace(/\.(safetensors|pt|ckpt)$/i, "");
                        children.appendChild(makeRow(displayName, childNorm, orig, 0, true));
                    }

                    header.addEventListener("click", (e) => {
                        e.stopPropagation();
                        const isHidden = children.style.display === "none";
                        children.style.display = isHidden ? "block" : "none";
                        arrowSpan.textContent = isHidden ? "\u25BE " : "\u25B8 ";
                    });

                    listEl.appendChild(header);
                    listEl.appendChild(children);
                }

                if (rootFiles.length > 0 && sortedDirs.length > 0) {
                    const sep = document.createElement("div");
                    Object.assign(sep.style, {
                        height: "1px", margin: "4px 12px",
                        background: "#444", opacity: "0.6"
                    });
                    listEl.appendChild(sep);

                    const rootLabel = document.createElement("div");
                    rootLabel.textContent = T.root_dir;
                    Object.assign(rootLabel.style, {
                        padding: "3px 12px", fontSize: "10px",
                        color: "#666", fontStyle: "italic"
                    });
                    listEl.appendChild(rootLabel);
                }
                for (const file of rootFiles) {
                    const orig = normalizedItems.find(n => n.norm === file)?.orig || file;
                    const displayName = file.replace(/\.(safetensors|pt|ckpt)$/i, "").split(/[\\/]/).pop();
                    listEl.appendChild(makeRow(displayName, file, orig, 0, true));
                }
            } else {
                // ===== Filter active: flat list of all matches (with relative path) =====
                // Match against path, path-without-extension, and underscore→space variant.
                const matches = normalizedItems.filter(({ norm, display }) => {
                    if (norm.toLowerCase().includes(filter)) return true;
                    if (display.toLowerCase().includes(filter)) return true;
                    if (display.replace(/_/g, " ").toLowerCase().includes(filter)) return true;
                    return false;
                });

                if (matches.length === 0) {
                    const empty = document.createElement("div");
                    empty.textContent = "（无匹配项）";
                    empty.style.cssText = "padding:12px;text-align:center;font-size:12px;color:#666;font-style:italic;";
                    listEl.appendChild(empty);
                } else {
                    // Show count hint
                    const hint = document.createElement("div");
                    hint.textContent = `${matches.length} 个匹配项`;
                    hint.style.cssText = "padding:4px 12px;font-size:10px;color:#666;font-style:italic;border-bottom:1px solid #2a2a2a;";
                    listEl.appendChild(hint);

                    for (const m of matches) {
                        listEl.appendChild(makeRow(m.display, m.norm, m.orig, 0, true));
                    }
                }
            }
        };

        // ===== Keyboard navigation =====
        const highlightRow = (idx) => {
            rows.forEach((r, i) => {
                if (i === idx) {
                    r.el.style.background = "#2a4a2a";
                    r.el.scrollIntoView({ block: "nearest" });
                } else {
                    const isSel = r.path === selectedNormalized ||
                        (r.path === "__none__" && selectedNormalized === "None");
                    r.el.style.background = isSel ? "#1a3a5a" : "transparent";
                }
            });
        };
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Escape") { e.preventDefault(); this.hide(); return; }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                if (rows.length === 0) return;
                let idx = this._activeIdx;
                if (e.key === "ArrowDown") idx = (idx + 1) % rows.length;
                else idx = idx <= 0 ? rows.length - 1 : idx - 1;
                this._activeIdx = idx;
                highlightRow(idx);
                return;
            }
            if (e.key === "Enter") {
                e.preventDefault();
                const r = rows[this._activeIdx];
                if (r) { onSelect(r.orig); this.hide(); }
                return;
            }
        });
        searchInput.addEventListener("input", () => {
            renderList(searchInput.value.trim().toLowerCase());
        });

        // Initial render
        renderList("");

        // ===== Position & show =====
        this.el.style.display = "block";
        const minWidth = 360;
        const w = Math.max(anchorRect.width, minWidth);
        this.el.style.width = w + "px";
        // Keep inside viewport horizontally
        let left = anchorRect.left;
        if (left + w > window.innerWidth - 8) left = Math.max(8, window.innerWidth - w - 8);
        this.el.style.left = left + "px";

        const spaceBelow = window.innerHeight - anchorRect.bottom;
        const spaceAbove = anchorRect.top;
        const maxH = Math.min(Math.max(spaceBelow, spaceAbove) - 20, 480);
        this.el.style.maxHeight = maxH + "px";
        if (spaceBelow >= 200 || spaceBelow > spaceAbove) {
            this.el.style.top = anchorRect.bottom + "px"; this.el.style.bottom = "auto";
        } else {
            this.el.style.bottom = (window.innerHeight - anchorRect.top) + "px"; this.el.style.top = "auto";
        }
        setTimeout(() => {
            document.addEventListener("mousedown", this._onOutside, true);
            document.addEventListener("pointerdown", this._onOutside, true);
        }, 0);
        requestAnimationFrame(() => searchInput.focus());
    }
    hide() {
        if (this.el.style.display === "none") return;
        this.el.style.display = "none";
        this._activeIdx = -1;
        document.removeEventListener("mousedown", this._onOutside, true);
        document.removeEventListener("pointerdown", this._onOutside, true);
        app.canvas?.setDirty(true);
    }
}
const domDropdown = new DomDropdown();

function parseRows(val) {
    try {
        const rows = JSON.parse(val || "[]");
        if (Array.isArray(rows) && rows.length) return rows;
    } catch {}
    return null;
}
function defaultRows() {
    return [{ enabled: true, lora: "None", strength: 1.0, trigger: "", note: "" }];
}

function drawBox(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

function makeHeaderWidget() {
    return {
        name: "__lora_header", type: "custom_lora_header",
        value: null, serialize: false,
        computeSize(ww) { return [ww, HEADER_H]; },
        draw(ctx, node, ww, y) {
            const cols = colWidths(ww);
            let x = PAD + INNER_PAD;
            ctx.fillStyle = "#606060";
            ctx.font = "10px sans-serif";
            ctx.textBaseline = "middle";
            [T.on_off, T.lora, T.strength, T.trigger, T.note, T.del].forEach((label, i) => {
                ctx.textAlign = "center";
                ctx.fillText(label, x + cols[i] / 2, y + HEADER_H / 2);
                x += cols[i] + GAP;
            });
        },
        mouse() { return false; }
    };
}

function makeLoraRowWidget(node, row, rowIndex, loraList, onDelete, onchange) {
    return {
        name: `__lora_row_${rowIndex}`, type: "custom_lora_row",
        value: null, serialize: false,
        computeSize(ww) { return [ww, ROW_H + 6]; },
        draw(ctx, node, ww, y) {
            this._lastY = y; this._lastW = ww;
            const cols = colWidths(ww);
            const ry = y + 3, rh = ROW_H;

            drawBox(ctx, PAD, ry, ww - PAD * 2, rh, 6,
                row.enabled ? "#1a2a1a" : "#271818",
                row.enabled ? "#2d5a2d" : "#5a2d2d");

            // 内容从底板内 INNER_PAD 处开始，开关/删除按钮不再贴底板边缘
            let x = PAD + INNER_PAD;

            // 修复2：胶囊严格居中在TOGGLE_W列内，不超出
            const tx = x + (cols[0] - TOG_W) / 2;
            const ty = ry + (rh - TOG_H) / 2;
            drawBox(ctx, tx, ty, TOG_W, TOG_H, TOG_H / 2,
                row.enabled ? "#2e7d32" : "#424242",
                row.enabled ? "#43a047" : "#555");
            const knobR = TOG_H / 2 - 2;
            const knobX = row.enabled ? tx + TOG_W - knobR - 2 : tx + knobR + 2;
            ctx.beginPath(); ctx.arc(knobX, ty + TOG_H / 2, knobR, 0, Math.PI * 2);
            ctx.fillStyle = "#fff"; ctx.fill();
            x += cols[0] + GAP;

            // LoRA下拉
            const lx = x, lw = cols[1];
            drawBox(ctx, lx, ry + 4, lw, rh - 8, 4, "#252525", "#3a3a3a");
            ctx.save(); ctx.rect(lx + 6, ry, lw - 20, rh + 6); ctx.clip();
            ctx.fillStyle = row.lora === "None" ? "#555" : "#ddd";
            ctx.font = "11.5px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
            ctx.fillText(
                row.lora === "None" ? T.select:
                    row.lora.replace(/\.(safetensors|pt|ckpt)$/i, "").split(/[\\/]/).pop(),
                lx + 7, ry + rh / 2);
            ctx.restore();
            ctx.fillStyle = "#666"; ctx.font = "10px sans-serif";
            ctx.textAlign = "right"; ctx.textBaseline = "middle";
            ctx.fillText("▾", lx + lw - 5, ry + rh / 2);
            x += lw + GAP;

            // 权重（带左右箭头微调 & 拖拽调整）
            const sx = x, sw = cols[2];
            drawBox(ctx, sx, ry + 4, sw, rh - 8, 4, "#252525", "#3a3a3a");

            // 左右箭头（各占约10px）
            const arrowW = 10;
            const aY = ry + 4, aH = rh - 8;
            // 左箭头点击区
            this._arrowLL = sx; this._arrowLR = sx + arrowW;
            this._arrowLT = aY; this._arrowLB = aY + aH;
            ctx.fillStyle = "#666";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("◀", sx + arrowW / 2 + 1, aY + aH / 2 + 0.5);
            // 右箭头点击区
            this._arrowRL = sx + sw - arrowW; this._arrowRR = sx + sw;
            this._arrowRT = aY; this._arrowRB = aY + aH;
            ctx.fillText("▶", sx + sw - arrowW / 2 - 1, aY + aH / 2 + 0.5);

            // 中间数值
            ctx.fillStyle = row.strength === 1.0 ? "#aaa" : "#7ec8e3";
            ctx.font = "12px 'Courier New', monospace";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(row.strength.toFixed(2), sx + sw / 2, ry + rh / 2);

            // 拖拽区（中间数值区域）
            this._dragL = sx + arrowW; this._dragR = sx + sw - arrowW;
            this._dragT = aY; this._dragB = aY + aH;

            // 拖拽时的视觉反馈提示线
            if (this._dragHint !== undefined) {
                ctx.strokeStyle = "#7ec8e3";
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.moveTo(this._dragHint, aY);
                ctx.lineTo(this._dragHint, aY + aH);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            x += sw + GAP;

            // 触发词
            drawBox(ctx, x, ry + 4, cols[3], rh - 8, 4, "#1e1e28", "#35354a");
            ctx.save(); ctx.rect(x + 4, ry, cols[3] - 8, rh + 6); ctx.clip();
            ctx.fillStyle = row.trigger ? "#e8c87e" : "#444";
            ctx.font = "10px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
            ctx.fillText(row.trigger || T.trigger_ph, x + 6, ry + rh / 2);
            ctx.restore();
            x += cols[3] + GAP;

            // 备注
            drawBox(ctx, x, ry + 4, cols[4], rh - 8, 4, "#1e1e28", "#35354a");
            ctx.save(); ctx.rect(x + 4, ry, cols[4] - 8, rh + 6); ctx.clip();
            ctx.fillStyle = row.note ? "#aaa" : "#444";
            ctx.font = "11px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
            ctx.fillText(row.note || T.note_ph, x + 6, ry + rh / 2);
            ctx.restore();
            x += cols[4] + GAP;

            // 删除
            const bs = rh - 8, bx = x + (cols[5] - bs) / 2, by = ry + 4;
            drawBox(ctx, bx, by, bs, bs, 5, "#6a0000", "#c0392b");
            ctx.fillStyle = "#ff6b6b";
            ctx.font = `bold ${Math.floor(bs * 0.58)}px sans-serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("✕", bx + bs / 2, by + bs / 2);
        },
        mouse(e, pos, node) {
            const [mx, my] = pos;
            const ww = this._lastW || node.size[0];
            const y = this._lastY || 0;

            // 拖拽调整权重（左右拖动，向右增大，向左减小）
            if (this._dragging && e.type === "pointermove") {
                const dx = mx - this._dragStartX;
                const delta = dx * 0.001; // 移动1px ≈ 0.001
                let v = Math.round((this._dragStartVal + delta) * 100) / 100;
                if (v < -100) v = -100; if (v > 100) v = 100;
                if (v !== row.strength) {
                    row.strength = v;
                    this._dragChanged = true;  // 权重确实变过，说明是拖拽行为
                    onchange();
                }
                return true;
            }
            if (this._dragging && (e.type === "pointerup" || e.type === "pointerleave")) {
                this._dragging = false;
                const changed = this._dragChanged;
                this._dragChanged = false;
                // 只有权重从未变过才算"点击"，弹出输入框；拖拽过（即使拖回原位）不弹
                if (e.type === "pointerup" && !changed) {
                    app.canvas.prompt(T.prompt_strength, row.strength.toFixed(2), (val) => {
                        const n = parseFloat(val);
                        if (!isNaN(n)) { row.strength = Math.round(n * 100) / 100; onchange(); }
                    }, e);
                }
                app.canvas?.setDirty(true, true);
                return true;
            }

            if (e.type !== "pointerdown") return false;
            if (my < y || my > y + ROW_H + 6) return false;

            const cols = colWidths(ww);
            let x = PAD + INNER_PAD;
            if (mx >= x && mx < x + cols[0]) { row.enabled = !row.enabled; onchange(); return true; }
            x += cols[0] + GAP;
            if (mx >= x && mx < x + cols[1]) {
                const rect = app.canvas.canvas.getBoundingClientRect();
                const scale = app.canvas.ds?.scale ?? 1;
                const off = app.canvas.ds?.offset ?? [0, 0];
                const sx = rect.left + (node.pos[0] + x) * scale + off[0] * scale;
                const sy = rect.top + (node.pos[1] + y + ROW_H) * scale + off[1] * scale;
                domDropdown.show(loraList, row.lora,
                    { left: sx, top: sy, bottom: sy, width: cols[1] * scale },
                    (sel) => {
                        row.lora = sel;
                        if (sel !== "None") {
                            try {
                                var t = localStorage.getItem("lora_trigger_" + sel);
                                row.trigger = t !== null ? t : "";
                            } catch(e) {}
                        } else {
                            row.trigger = "";
                        }
                        onchange();
                    });
                return true;
            }
            x += cols[1] + GAP;
            if (mx >= x && mx < x + cols[2]) {
                // 左箭头点击
                if (this._arrowLL !== undefined &&
                    mx >= this._arrowLL && mx <= this._arrowLR &&
                    my >= this._arrowLT && my <= this._arrowLB) {
                    const v = row.strength - 0.01;
                    row.strength = Math.round(Math.max(-100, v) * 100) / 100;
                    onchange();
                    return true;
                }
                // 右箭头点击
                if (this._arrowRL !== undefined &&
                    mx >= this._arrowRL && mx <= this._arrowRR &&
                    my >= this._arrowRT && my <= this._arrowRB) {
                    const v = row.strength + 0.01;
                    row.strength = Math.round(Math.min(100, v) * 100) / 100;
                    onchange();
                    return true;
                }
                // 中间数值区：点击可直接输入，按住拖拽可快速调整（左右水平拖拽）
                if (this._dragL !== undefined &&
                    mx >= this._dragL && mx <= this._dragR &&
                    my >= this._dragT && my <= this._dragB) {
                    this._dragging = true;
                    this._dragChanged = false;
                    this._dragStartVal = row.strength;
                    this._dragStartX = mx;
                    return true;
                }
                return false;
            }
            x += cols[2] + GAP;
            if (mx >= x && mx < x + cols[3]) {
                app.canvas.prompt(T.prompt_trigger, row.trigger || "", (val) => {
                    row.trigger = val;
                    if (row.lora !== "None") {
                        try { localStorage.setItem("lora_trigger_" + row.lora, val); } catch(e) {}
                    }
                    onchange();
                }, e);
                return true;
            }
            x += cols[3] + GAP;
            if (mx >= x && mx < x + cols[4]) {
                app.canvas.prompt(T.prompt_note, row.note, (val) => { row.note = val; onchange(); }, e);
                return true;
            }
            x += cols[4] + GAP;
            if (mx >= x && mx < x + cols[5]) { onDelete(); return true; }
            return false;
        }
    };
}

// 修复3：自定义添加按钮widget，文字真正垂直居中
function makeAddButtonWidget(onClick) {
    const BTN_H = 28;
    return {
        name: "__lora_add_btn", type: "custom_lora_add",
        value: null, serialize: false,
        computeSize(ww) { return [ww, BTN_H + 8]; },
        draw(ctx, node, ww, y) {
            this._lastY = y;
            const hovered = !!this._hovered;
            const x = PAD, by = y + 4, bw = ww - PAD * 2;
            // 透明背景（hover 时亮蓝），与"添加分辨率"按钮风格一致
            ctx.beginPath();
            ctx.roundRect(x, by, bw, BTN_H, 6);
            ctx.fillStyle = hovered ? "#1e3a5a" : "transparent";
            ctx.fill();
            // 虚线边框（hover 时加粗高亮）
            ctx.strokeStyle = hovered ? "#4a9eff" : "#3a5a7a";
            ctx.lineWidth = hovered ? 1.5 : 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            // 文字：hover 时变白，平时蓝色
            ctx.fillStyle = hovered ? "#ffffff" : "#4a9eff";
            ctx.font = "bold 13px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(T.add, ww / 2, by + BTN_H / 2);
        },
        mouse(e, pos) {
            const [, my] = pos;
            const y = this._lastY || 0;
            const inside = my >= y + 4 && my <= y + 4 + BTN_H;
            // hover 跟踪：进入/离开时刷新画布
            if (e.type === "pointermove") {
                if (inside !== !!this._hovered) {
                    this._hovered = inside;
                    app.canvas?.setDirty(true, true);
                }
                return false;
            }
            if (e.type !== "pointerdown") return false;
            if (inside) { onClick(); return true; }
            return false;
        }
    };
}

app.registerExtension({
    name: "MultiLoraLoader",
    async nodeCreated(node) {
        if (node.comfyClass !== "MultiLoraLoader") return;

        const stackWidget = node.widgets?.find(w => w.name === "lora_stack");
        if (stackWidget) {
            stackWidget.computeSize = () => [0, -4];
            stackWidget.draw = () => {};
        }

        if (node.size[0] < NODE_MIN_W) node.size[0] = NODE_MIN_W;

        let loraList = ["None"];
        try {
            const resp = await fetch("/object_info/LoraLoader");
            const data = await resp.json();
            const vals = data?.LoraLoader?.input?.required?.lora_name?.[0];
            if (Array.isArray(vals)) loraList = ["None", ...vals];
        } catch (e) {}

        node._rebuild = (rows) => {
            node._loraRows = rows;
            node.widgets = (node.widgets || []).filter(w =>
                w.name === "model" || w.name === "lora_stack"
            );
            const sw = node.widgets?.find(w => w.name === "lora_stack");
            if (sw) { sw.computeSize = () => [0, -4]; sw.draw = () => {}; }

            node.addCustomWidget(makeHeaderWidget());
            rows.forEach((row, i) => {
                node.addCustomWidget(makeLoraRowWidget(node, row, i, loraList,
                    () => { rows.splice(i, 1); node._rebuild(rows); },
                    () => { if (sw) sw.value = JSON.stringify(rows); app.canvas?.setDirty(true, true); }
                ));
            });

            // 用自定义widget替代原生button
            node.addCustomWidget(makeAddButtonWidget(() => {
                rows.push({ enabled: true, lora: "None", strength: 1.0, trigger: "", note: "" });
                node._rebuild(rows);
            }));

            if (stackWidget) stackWidget.value = JSON.stringify(rows);
            node.setSize([node.size[0], node.computeSize()[1]]);
            app.canvas?.setDirty(true, true);
        };

        const initialRows = parseRows(stackWidget?.value) ?? defaultRows();
        node._rebuild(initialRows);

        // node 级 hover 跟踪：canvas widget 自身的 mouse 不会被普通鼠标移动触发，
        // 所以在 node 的 onMouseMove 里检测鼠标是否落在"添加 LoRA"按钮区域。
        const addBtnRect = (btn) => {
            if (!btn || btn._lastY === undefined) return null;
            const top = btn._lastY + 4;
            return { top: top, bottom: top + 28, left: PAD, right: node.size[0] - PAD };
        };
        const oldMouseMove = node.onMouseMove;
        node.onMouseMove = function (e, pos) {
            oldMouseMove?.apply(this, arguments);
            const btn = this.widgets?.find(w => w.name === "__lora_add_btn");
            const r = addBtnRect(btn);
            if (!r) return;
            const [mx, my] = pos;
            const inside = mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom;
            if (inside !== !!btn._hovered) {
                btn._hovered = inside;
                const cv = app.canvas?.canvas;
                if (cv) cv.style.cursor = inside ? "pointer" : "";
                app.canvas?.setDirty(true, true);
            }
        };
        const oldMouseLeave = node.onMouseLeave;
        node.onMouseLeave = function (e) {
            oldMouseLeave?.apply(this, arguments);
            const btn = this.widgets?.find(w => w.name === "__lora_add_btn");
            if (btn && btn._hovered) {
                btn._hovered = false;
                const cv = app.canvas?.canvas;
                if (cv) cv.style.cursor = "";
                app.canvas?.setDirty(true, true);
            }
        };
    }
});