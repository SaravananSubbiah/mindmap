import { $document, $win } from '../config';
import { customizeUtil } from '../util';
import { MindMapMain } from '../mind-map-main';
import { MindMapNode } from '../mind-map-node';

const jcanvas = customizeUtil.canvas;
const jdom = customizeUtil.dom;


const clear_selection = 'getSelection' in $win ? function () {
    $win.getSelection().removeAllRanges();
} : function () {
    $document.selection.empty();
};

const options = {
    line_width: 5,
    lookup_delay: 500,
    lookup_interval: 80
};

export class Draggable {
    jm: MindMapMain;
    e_canvas: any;
    canvas_ctx: any;
    shadow: any;
    shadow_w: number;
    shadow_h: number;
    active_node: any;
    target_node: any;
    target_direct: any;
    client_w: number;
    client_h: number;
    offset_x: number;
    offset_y: number;
    hlookup_delay: number;
    hlookup_timer: number;
    capture: boolean;
    moved: boolean;
    client_hw: number;
    client_hh: number;


    constructor(jm) {
        this.jm = jm;
        this.e_canvas = null;
        this.canvas_ctx = null;
        this.shadow = null;
        this.shadow_w = 0;
        this.shadow_h = 0;
        this.active_node = null;
        this.target_node = null;
        this.target_direct = null;
        this.client_w = 0;
        this.client_h = 0;
        this.offset_x = 0;
        this.offset_y = 0;
        this.hlookup_delay = 0;
        this.hlookup_timer = 0;
        this.capture = false;
        this.moved = false;
    }

    init() {
        this._create_canvas();
        this._create_shadow();
        this._event_bind();
    }

    resize() {
        this.jm.view.eNodes.appendChild(this.shadow);
        this.e_canvas.width = this.jm.view.size.w;
        this.e_canvas.height = this.jm.view.size.h;
    }

    _create_canvas() {
        const c = $document.createElement('canvas');
        this.jm.view.ePanel.appendChild(c);
        const ctx = c.getContext('2d');
        this.e_canvas = c;
        this.canvas_ctx = ctx;
    }

    _create_shadow() {
        const s = $document.createElement('jmnode');
        s.style.visibility = 'hidden';
        s.style.zIndex = '3';
        s.style.cursor = 'move';
        s.style.opacity = '0.7';
        this.shadow = s;
    }

    reset_shadow(el) {
        const s = this.shadow.style;
        this.shadow.innerHTML = el.innerHTML;
        s.left = el.style.left;
        s.top = el.style.top;
        s.width = el.style.width;
        s.height = el.style.height;
        s.backgroundImage = el.style.backgroundImage;
        s.backgroundSize = el.style.backgroundSize;
        s.transform = el.style.transform;
        this.shadow_w = this.shadow.clientWidth;
        this.shadow_h = this.shadow.clientHeight;

    }

    show_shadow() {
        if (!this.moved) {
            this.shadow.style.visibility = 'visible';
        }
    }

    hide_shadow() {
        this.shadow.style.visibility = 'hidden';
    }

    clear_lines() {
        jcanvas.clear(this.canvas_ctx, 0, 0, this.jm.view.size.w, this.jm.view.size.h);
    }

    _magnet_shadow(node) {
        if (!!node) {
            this.canvas_ctx.lineWidth = options.line_width;
            this.canvas_ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            this.canvas_ctx.lineCap = 'round';
            this.clear_lines();
            jcanvas.lineto(this.canvas_ctx,
                node.sp.x,
                node.sp.y,
                node.np.x,
                node.np.y);
        }
    }

    _lookup_close_node() {
        const root = this.jm.getRoot();
        const root_location = root.getLocation();
        const root_size = root.getSize();
        const root_x = root_location.x + root_size.w / 2;

        const sw = this.shadow_w;
        const sh = this.shadow_h;
        const sx = this.shadow.offsetLeft;
        const sy = this.shadow.offsetTop;

        let ns, nl;

        const direct = (sx + sw / 2) >= root_x ?
            MindMapMain.direction.right : MindMapMain.direction.left;
        const nodes = this.jm.mind.nodes;
        let node = null;
        let min_distance = Number.MAX_VALUE;
        let distance = 0;
        let closest_node = null;
        let closest_p = null;
        let shadow_p = null;
        for (const nodeid in nodes) {
            let np, sp;
            node = nodes[nodeid];
            if (node.isroot || node.direction == direct) {
                if (node.id == this.active_node.id) {
                    continue;
                }
                ns = node.getSize();
                nl = node.getLocation();
                if (direct == MindMapMain.direction.right) {
                    if (sx - nl.x - ns.w <= 0) {continue;}
                    distance = Math.abs(sx - nl.x - ns.w) + Math.abs(sy + sh / 2 - nl.y - ns.h / 2);
                    np = { x: nl.x + ns.w - options.line_width, y: nl.y + ns.h / 2 };
                    sp = { x: sx + options.line_width, y: sy + sh / 2 };
                } else {
                    if (nl.x - sx - sw <= 0) {continue;}
                    distance = Math.abs(sx + sw - nl.x) + Math.abs(sy + sh / 2 - nl.y - ns.h / 2);
                    np = { x: nl.x + options.line_width, y: nl.y + ns.h / 2 };
                    sp = { x: sx + sw - options.line_width, y: sy + sh / 2 };
                }
                if (distance < min_distance) {
                    closest_node = node;
                    closest_p = np;
                    shadow_p = sp;
                    min_distance = distance;
                }
            }
        }
        let result_node = null;
        if (!!closest_node) {
            result_node = {
                node: closest_node,
                direction: direct,
                sp: shadow_p,
                np: closest_p
            };
        }
        return result_node;
    }

    lookup_close_node() {
        const node_data = this._lookup_close_node();
        if (!!node_data) {
            this._magnet_shadow(node_data);
            this.target_node = node_data.node;
            this.target_direct = node_data.direction;
        }
    }

    _event_bind() {
        const jd = this;
        const container = this.jm.view.container;
        jdom.addEvent(container, 'mousedown', function (e) {
            const evt = e || event;
            jd.dragstart.call(jd, evt);
        });
        jdom.addEvent(container, 'mousemove', function (e) {
            const evt = e || event;
            jd.drag.call(jd, evt);
        });
        jdom.addEvent(container, 'mouseup', function (e) {
            const evt = e || event;
            jd.dragend.call(jd, evt);
        });
        jdom.addEvent(container, 'touchstart', function (e) {
            const evt = e || event;
            jd.dragstart.call(jd, evt);
        });
        jdom.addEvent(container, 'touchmove', function (e) {
            const evt = e || event;
            jd.drag.call(jd, evt);
        });
        jdom.addEvent(container, 'touchend', function (e) {
            const evt = e || event;
            jd.dragend.call(jd, evt);
        });
    }

    dragstart(e) {
        if (!this.jm.getEditable()) {return;}
        if (this.capture) {return;}
        this.active_node = null;

        const jview = this.jm.view;
        const el = e.target || event.srcElement;
        if (el.tagName.toLowerCase() != 'jmnode') {return;}
        const nodeid = jview.getBindedNodeId(el);
        if (!!nodeid) {
            const node = this.jm.getNode(nodeid);
            if (!node.isroot) {
                this.reset_shadow(el);
                this.active_node = node;
                this.offset_x = (e.clientX || e.touches[0].clientX) - el.offsetLeft;
                this.offset_y = (e.clientY || e.touches[0].clientY) - el.offsetTop;
                this.client_hw = Math.floor(el.clientWidth / 2);
                this.client_hh = Math.floor(el.clientHeight / 2);
                if (this.hlookup_delay != 0) {
                    $win.clearTimeout(this.hlookup_delay);
                }
                if (this.hlookup_timer != 0) {
                    $win.clearInterval(this.hlookup_timer);
                }
                const jd = this;
                this.hlookup_delay = $win.setTimeout(function () {
                    jd.hlookup_delay = 0;
                    jd.hlookup_timer = $win.setInterval(function () {
                        jd.lookup_close_node.call(jd);
                    }, options.lookup_interval);
                }, options.lookup_delay);
                this.capture = true;
            }
        }
    }

    drag(e) {
        if (!this.jm.getEditable()) {return;}
        if (this.capture) {
            e.preventDefault();
            this.show_shadow();
            this.moved = true;
            clear_selection();
            const px = (e.clientX || e.touches[0].clientX) - this.offset_x;
            const py = (e.clientY || e.touches[0].clientY) - this.offset_y;
            const cx = px + this.client_hw;
            const cy = py + this.client_hh;
            this.shadow.style.left = px + 'px';
            this.shadow.style.top = py + 'px';
            clear_selection();
        }
    }

    dragend(e) {
        if (!this.jm.getEditable()) {return;}
        if (this.capture) {
            if (this.hlookup_delay != 0) {
                $win.clearTimeout(this.hlookup_delay);
                this.hlookup_delay = 0;
                this.clear_lines();
            }
            if (this.hlookup_timer != 0) {
                $win.clearInterval(this.hlookup_timer);
                this.hlookup_timer = 0;
                this.clear_lines();
            }
            if (this.moved) {
                const src_node = this.active_node;
                const target_node = this.target_node;
                const target_direct = this.target_direct;
                this.move_node(src_node, target_node, target_direct);
            }
            this.hide_shadow();
        }
        this.moved = false;
        this.capture = false;
    }

    move_node(src_node, target_node, target_direct) {
        const shadow_h = this.shadow.offsetTop;
        if (!!target_node && !!src_node && !MindMapNode.inherited(src_node, target_node)) {
            // lookup before_node
            const sibling_nodes = target_node.children;
            let sc = sibling_nodes.length;
            let node = null;
            let delta_y = Number.MAX_VALUE;
            let node_before = null;
            let beforeid = '_last_';
            while (sc--) {
                node = sibling_nodes[sc];
                if (node.direction == target_direct && node.id != src_node.id) {
                    const dy = node.getLocation().y - shadow_h;
                    if (dy > 0 && dy < delta_y) {
                        delta_y = dy;
                        node_before = node;
                        beforeid = '_first_';
                    }
                }
            }
            if (!!node_before) {beforeid = node_before.id;}
            this.jm.moveNode(src_node.id, beforeid, target_node.id, target_direct);
        }
        this.active_node = null;
        this.target_node = null;
        this.target_direct = null;
    }

    jm_event_handle(type, data) {
        if (type === MindMapMain.eventType.resize) {
            this.resize();
        }
    }
}
