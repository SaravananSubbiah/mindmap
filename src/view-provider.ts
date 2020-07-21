import * as _ from 'lodash';
import { $create, $document, $get, $html, $text, logger } from './config';
import { customizeUtil } from './util';
import { MindMapMain } from './mind-map-main';

export class ViewProvider {
    opts: any;
    jm: any;
    layout: any;
    container = null;
    ePanel = null;
    eNodes = null;
    eCanvas = null;
    canvasCtx = null;
    size = { w: 0, h: 0 };
    selectedNode = null;
    selectedOptions;
    editingNode = null;
    previousNode = null;

    eEditor;
    eSelect;
    currentSelect;
    actualZoom;
    zoomStep;
    minZoom;
    maxZoom;

    constructor(jm, options) {
        this.opts = options;
        this.jm = jm;
        this.selectedOptions = this.jm.getSelectTypesByHierarchyRule();
        this.layout = jm.layout;

        this.jm.mindMapDataReceiver.subscribe(data => {
            this.editNodeEnd(data);
        });
    }

    static get_select_option(value) {
        const eOption = $create('option');
        eOption.value = value;
        eOption.appendChild($document.createTextNode(value));
        return eOption;
    };

    init() {
        logger.debug('view.init');

        this.container = $get(this.opts.container);
        if (!this.container) {
            logger.error('the options.view.container was not be found in dom');
            return;
        }

        this.initView();
    }

    initView() {
        this.ePanel = $create('div');
        this.eCanvas = $create('canvas');
        this.eNodes = $create('jmnodes');

        this.ePanel.className = 'jsmind-inner';
        this.ePanel.appendChild(this.eCanvas);
        this.ePanel.appendChild(this.eNodes);

        this.actualZoom = 1;
        this.zoomStep = 0.1;
        this.minZoom = 0.5;
        this.maxZoom = 2;

        this.addEventToCanvas();
        this.initSelect();
        this.initEditor();

        this.container.appendChild(this.ePanel);
        this.canvasCtx = this.eCanvas.getContext('2d');
    }

    initSelect() {
        this.eSelect = $create('select');
        this.eSelect.value = this.selectedOptions[0];
        this.selectedOptions.forEach((ele) => {
            this.eSelect.appendChild(ViewProvider.get_select_option(ele));
        });
        this.addEventToSelect(this.eSelect);
    }

    initEditor() {
        this.eEditor = $create('input');
        this.eEditor.className = 'jsmind-editor';
        this.eEditor.type = 'text';
        this.addEventToEditor(this.eEditor);
    }

    addEventToCanvas() {
        customizeUtil.dom.addEvent(this.eNodes, 'click', (e) => {
            this.editNodeEnd();
            e.stopPropagation();
        });
    }

    addEventToEditor(editor) {
        customizeUtil.dom.addEvent(editor, 'keydown', (e) => {
            const evt = e || event;
            if (evt.keyCode == 13) {
                this.editNodeEnd();
                evt.stopPropagation();
            }
        });
        customizeUtil.dom.addEvent(editor, 'blur', () => {
            this.editNodeEnd();
        });
        customizeUtil.dom.addEvent(editor, 'click', (e) => {
            const evt = e || event;
            evt.stopPropagation();
        });
        customizeUtil.dom.addEvent(editor, 'focus', (e) => {
            const evt = e || event;
            evt.stopPropagation();
            const type = this.editingNode.selectedType;
            if (this.getIsInteractSelectedValue(type)) {
                this.jm.mindMapDataTransporter.next({type, topic: this.editingNode.topic});
            }
        });
    }

    addEventToSelect(select) {
        customizeUtil.dom.addEvent(select, 'click', (e) => {
            const evt = e || event;
            evt.stopPropagation();
        });
        customizeUtil.dom.addEvent(select, 'change', (e) => {
            const evt = e || event;
            evt.stopPropagation();
            const value = _.get(evt, 'srcElement.value');
            if (this.getIsInteractSelectedValue(value)) {
                this.jm.mindMapDataTransporter.next(value);
            }
        });
    }


    getIsInteractSelectedValue(value) {
        return this.jm.options.hasInteraction && value === _.last(this.selectedOptions);
    }


    addEvent(obj, event_name, event_handle) {
        customizeUtil.dom.addEvent(this.eNodes, event_name, function (e) {
            const evt = e || event;
            event_handle.call(obj, evt);
        });
    }

    getBindedNodeId(element) {
        if (element == null) {
            return null;
        }
        const tagName = element.tagName.toLowerCase();
        if (tagName == 'jmnodes' || tagName == 'body' || tagName == 'html') {
            return null;
        }
        if (tagName == 'jmnode' || tagName == 'jmexpander') {
            return element.getAttribute('nodeid');
        } else {
            return this.getBindedNodeId(element.parentElement);
        }
    }

    isExpander(element) {
        return (element.tagName.toLowerCase() == 'jmexpander');
    }

    reset() {
        logger.debug('view.reset');
        this.selectedNode = null;
        this.clearLines();
        this.clearNodes();
        this.resetTheme();
    }

    resetTheme() {
        const theme_name = this.jm.options.theme;
        if (!!theme_name) {
            this.eNodes.className = 'theme-' + theme_name;
        } else {
            this.eNodes.className = '';
        }
    }

    resetCustomStyle() {
        const nodes = this.jm.mind.nodes;
        for (let nodeid in nodes) {
            this.resetNodeCustomStyle(nodes[nodeid]);
        }
    }

    load() {
        logger.debug('view.load');
        this.initNodes();
    }

    expandSize() {
        const min_size = this.layout.getMinSize();
        let min_width = min_size.w + this.opts.hmargin * 2;
        let min_height = min_size.h + this.opts.vmargin * 2;
        let client_w = this.ePanel.clientWidth;
        let client_h = this.ePanel.clientHeight;
        if (client_w < min_width) {client_w = min_width;}
        if (client_h < min_height) {client_h = min_height;}
        this.size.w = client_w;
        this.size.h = client_h;
    }

    initNodesSize(node) {
        const view_data = node._data.view;
        view_data.width = view_data.element.clientWidth;
        view_data.height = view_data.element.clientHeight;
    }

    initNodes() {
        const nodes = this.jm.mind.nodes;
        const doc_frag = $document.createDocumentFragment();
        for (let nodeid in nodes) {
            this.createNodeElement(nodes[nodeid], doc_frag);
        }
        this.eNodes.appendChild(doc_frag);
        for (let nodeid in nodes) {
            this.initNodesSize(nodes[nodeid]);
        }
    }

    addNode(node) {
        this.createNodeElement(node, this.eNodes);
        this.initNodesSize(node);
    }

    createNodeElement(node, parent_node) {
        let view_data = null;
        if ('view' in node._data) {
            view_data = node._data.view;
        } else {
            view_data = {};
            node._data.view = view_data;
        }

        const d = $create('jmnode');
        if (node.isroot) {
            d.className = 'root';
        } else {
            let d_e = $create('jmexpander');
            $text(d_e, '-');
            d_e.setAttribute('nodeid', node.id);
            d_e.style.visibility = 'hidden';
            parent_node.appendChild(d_e);
            view_data.expander = d_e;
        }
        if (!!node.topic) {
            if (this.opts.supportHtml) {
                $html(d, node.show());
            } else {
                $text(d, node.show());
            }
        }
        d.setAttribute('nodeid', node.id);
        d.style.visibility = 'hidden';
        this._resetNodeCustomStyle(d, node.data);
        parent_node.appendChild(d);
        view_data.element = d;
    }

    removeNode(node) {
        if (this.selectedNode != null && this.selectedNode.id == node.id) {
            this.selectedNode = null;
        }
        if (this.editingNode != null && this.editingNode.id == node.id) {
            node._data.view.element.removeChild(this.eEditor);
            this.editingNode = null;
        }
        const children = node.children;
        let i = children.length;
        while (i--) {
            this.removeNode(children[i]);
        }
        if (node._data.view) {
            const element = node._data.view.element;
            const expander = node._data.view.expander;
            this.eNodes.removeChild(element);
            this.eNodes.removeChild(expander);
            node._data.view.element = null;
            node._data.view.expander = null;
        }
    }

    updateNode(node) {
        const view_data = node._data.view;
        const element = view_data.element;
        if (!!node.topic) {
            if (this.opts.supportHtml) {
                $html(element, node.show());
            } else {
                $text(element, node.show());
            }
        }
        view_data.width = element.clientWidth;
        view_data.height = element.clientHeight;
    }

    selectNode(node) {
        if (!!this.selectedNode) {
            this.selectedNode._data.view.element.className =
                this.selectedNode._data.view.element.className.replace(/\s*selected\s*/i, '');
            this.resetNodeCustomStyle(this.selectedNode);
        }
        if (!!node) {
            this.selectedNode = node;
            node._data.view.element.className += ' selected';
            this.clearNodeCustomStyle(node);
        }
    }

    selectClear() {
        this.selectNode(null);
    }

    getEditingNode() {
        return this.editingNode;
    }

    isEditing() {
        return (!!this.editingNode);
    }

    createSelectByTypes(types) {
        const newSelect = $create('select');
        types.slice(1).forEach(type => {
            newSelect.appendChild(ViewProvider.get_select_option(type));
        });
        if (types.length <= 1) {
            newSelect.style.borderColor = 'red';
        }
        this.addEventToSelect(newSelect);

        newSelect.value = types[0];
        return newSelect;
    }

    // when db click
    editNodeBegin(node, types) {
        if (!node.topic) {
            logger.warn("don't edit image nodes");
            return;
        }
        if (this.editingNode != null) {
            this.editNodeEnd();
        }
        this.editingNode = node;
        this.previousNode = node;
        const view_data = node._data.view;
        const element = view_data.element;
        const topic = node.topic;
        const ncs = getComputedStyle(element);
        this.eEditor.value = topic;
        this.eEditor.style.width
            = (element.clientWidth - parseInt(ncs.getPropertyValue('padding-left')) - parseInt(ncs.getPropertyValue('padding-right'))) + 'px';
        element.innerHTML = '';
        if (types) {
            this.currentSelect = this.createSelectByTypes(types);
        } else {
            this.currentSelect = this.eSelect;
        }
        element.appendChild(this.currentSelect);
        element.appendChild(this.eEditor);
        element.style.zIndex = 5;
        // this.eEditor.focus();
        // this.eEditor.select();
    }

    editNodeEnd(value?) {
        if (this.editingNode != null) {
            const node = this.editingNode;
            this.editingNode = null;
            const view_data = node._data.view;
            const element = view_data.element;
            if (value) {
                this.eEditor.value = value;
            }
            const topic = this.eEditor.value;
            const selectedType = this.currentSelect.value;
            element.style.zIndex = 'auto';
            element.removeChild(this.eEditor);
            element.removeChild(this.currentSelect);
            if (customizeUtil.text.isEmpty(topic) ||
                customizeUtil.text.isEmpty(selectedType) ||
                (node.topic === topic && node.selectedType === selectedType)) {
                if (this.opts.supportHtml) {
                    $html(element, node.show());
                } else {
                    $text(element, node.show());
                }
            } else {
                this.jm.updateNode(node.id, topic, selectedType);
            }
        } else if (value) {
            this.jm.updateNode(this.previousNode.id, value, this.previousNode.selectedType);
        }
    }

    getViewOffset() {
        const bounds = this.layout.bounds;
        const _x = (this.size.w - bounds.e - bounds.w) / 2;
        const _y = this.size.h / 2;
        return { x: _x, y: _y };
    }

    resize() {
        this.eCanvas.width = 1;
        this.eCanvas.height = 1;
        this.eNodes.style.width = '1px';
        this.eNodes.style.height = '1px';

        this.expandSize();
        this._show();
    }

    _show() {
        this.eCanvas.width = this.size.w;
        this.eCanvas.height = this.size.h;
        this.eNodes.style.width = this.size.w + 'px';
        this.eNodes.style.height = this.size.h + 'px';
        this.showNodes();
        this.showLines();
        //this.layout.cache_valid = true;
        this.jm.invokeEventHandleNextTick(MindMapMain.eventType.resize, { data: [] });
    }

    zoomIn() {
        return this.setZoom(this.actualZoom + this.zoomStep);
    }

    zoomOut() {
        return this.setZoom(this.actualZoom - this.zoomStep);
    }

    setZoom(zoom) {
        if ((zoom < this.minZoom) || (zoom > this.maxZoom)) {
            return false;
        }
        this.actualZoom = zoom;
        for (let i = 0; i < this.ePanel.children.length; i++) {
            this.ePanel.children[i].style.transform = 'scale(' + zoom + ')';
        }
        ;
        this.show(true);
        return true;

    }

    _centerRoot() {
        // center root node
        const outer_w = this.ePanel.clientWidth;
        const outer_h = this.ePanel.clientHeight;
        if (this.size.w > outer_w) {
            const _offset = this.getViewOffset();
            this.ePanel.scrollLeft = _offset.x - outer_w / 2;
        }
        if (this.size.h > outer_h) {
            this.ePanel.scrollTop = (this.size.h - outer_h) / 2;
        }
    }

    show(keep_center) {
        logger.debug('view.show');
        this.expandSize();
        this._show();
        if (!!keep_center) {
            this._centerRoot();
        }
    }

    relayout() {
        this.expandSize();
        this._show();
    }

    saveLocation(node) {
        const vd = node._data.view;
        vd._saved_location = {
            x: parseInt(vd.element.style.left) - this.ePanel.scrollLeft,
            y: parseInt(vd.element.style.top) - this.ePanel.scrollTop,
        };
    }

    restoreLocation(node) {
        const vd = node._data.view;
        this.ePanel.scrollLeft = parseInt(vd.element.style.left) - vd._saved_location.x;
        this.ePanel.scrollTop = parseInt(vd.element.style.top) - vd._saved_location.y;
    }

    clearNodes() {
        const mind = this.jm.mind;
        if (mind == null) {
            return;
        }
        const nodes = mind.nodes;
        let node = null;
        for (let nodeid in nodes) {
            node = nodes[nodeid];
            node._data.view.element = null;
            node._data.view.expander = null;
        }
        this.eNodes.innerHTML = '';
    }

    showNodes() {
        const nodes = this.jm.mind.nodes;
        let node = null;
        let node_element = null;
        let operationArea = null;
        let expander = null;
        let p = null;
        let p_expander = null;
        let expander_text = '-';
        let view_data = null;
        const _offset = this.getViewOffset();
        for (let nodeid in nodes) {
            node = nodes[nodeid];
            view_data = node._data.view;
            node_element = view_data.element;
            operationArea = view_data.operationArea;
            expander = view_data.expander;
            if (!this.layout.isVisible(node)) {
                node_element.style.display = 'none';
                expander.style.display = 'none';
                continue;
            }
            this.resetNodeCustomStyle(node);
            p = this.layout.getNodePoint(node);
            view_data.abs_x = _offset.x + p.x;
            view_data.abs_y = _offset.y + p.y;
            node_element.style.left = (_offset.x + p.x) + 'px';
            node_element.style.top = (_offset.y + p.y) + 'px';
            node_element.style.display = '';
            node_element.style.visibility = 'visible';

            if (operationArea) {
                operationArea.style.left = (_offset.x + p.x) + 'px';
                operationArea.style.top = (_offset.y + p.y + 43) + 'px';
            }
            if (!node.isroot && node.children.length > 0) {
                expander_text = node.expanded ? '-' : '+';
                p_expander = this.layout.getExpanderPoint(node);
                expander.style.left = (_offset.x + p_expander.x) + 'px';
                expander.style.top = (_offset.y + p_expander.y) + 'px';
                expander.style.display = '';
                expander.style.visibility = 'visible';
                $text(expander, expander_text);
            }
            if (!node.isroot) {

            }
            // hide expander while all children have been removed
            if (!node.isroot && node.children.length == 0) {
                expander.style.display = 'none';
                expander.style.visibility = 'hidden';
            }
        }
    }

    resetNodeCustomStyle(node) {
        this._resetNodeCustomStyle(node._data.view.element, node.data);
    }

    _resetNodeCustomStyle(node_element, node_data) {
        if ('background-color' in node_data) {
            node_element.style.backgroundColor = node_data['background-color'];
        }
        if ('foreground-color' in node_data) {
            node_element.style.color = node_data['foreground-color'];
        }
        if ('width' in node_data) {
            node_element.style.width = node_data['width'] + 'px';
        }
        if ('height' in node_data) {
            node_element.style.height = node_data['height'] + 'px';
        }
        if ('font-size' in node_data) {
            node_element.style.fontSize = node_data['font-size'] + 'px';
        }
        if ('font-weight' in node_data) {
            node_element.style.fontWeight = node_data['font-weight'];
        }
        if ('font-style' in node_data) {
            node_element.style.fontStyle = node_data['font-style'];
        }
        if ('color' in node_data) {
            node_element.style.color = node_data['color'];
        }
        if ('background-image' in node_data) {
            const backgroundImage = node_data['background-image'];
            if (backgroundImage.startsWith('data') && node_data['width'] && node_data['height']) {
                const img = new Image();

                img.onload = function () {
                    const c = $create('canvas');
                    c.width = node_element.clientWidth;
                    c.height = node_element.clientHeight;
                    const img = this;
                    if (c.getContext) {
                        const ctx = c.getContext('2d');
                        ctx.drawImage(img, 2, 2, node_element.clientWidth, node_element.clientHeight);
                        const scaledImageData = c.toDataURL();
                        node_element.style.backgroundImage = 'url(' + scaledImageData + ')';
                    }
                };
                img.src = backgroundImage;

            } else {
                node_element.style.backgroundImage = 'url(' + backgroundImage + ')';
            }
            node_element.style.backgroundSize = '99%';

            if ('background-rotation' in node_data) {
                node_element.style.transform = 'rotate(' + node_data['background-rotation'] + 'deg)';
            }

        }
    }

    clearNodeCustomStyle(node) {
        const node_element = node._data.view.element;
        node_element.style.backgroundColor = "";
        node_element.style.color = "";
    }

    clearLines(canvas_ctx?) {
        const ctx = canvas_ctx || this.canvasCtx;
        customizeUtil.canvas.clear(ctx, 0, 0, this.size.w, this.size.h);
    }

    showLines(canvas_ctx?) {
        this.clearLines(canvas_ctx);
        const nodes = this.jm.mind.nodes;
        let node = null;
        let pin = null;
        let pout = null;
        const _offset = this.getViewOffset();
        for (let nodeid in nodes) {
            node = nodes[nodeid];
            if (!!node.isroot) {continue;}
            if (('visible' in node._data.layout) && !node._data.layout.visible) {continue;}
            pin = this.layout.getNodePointIn(node);
            pout = this.layout.getNodePointOut(node.parent);
            this.drawLine(pout, pin, _offset, canvas_ctx);
        }
    }

    drawLine(pin, pout, offset, canvas_ctx) {
        let ctx = canvas_ctx || this.canvasCtx;
        ctx.strokeStyle = this.opts.lineColor;
        ctx.lineWidth = this.opts.lineWidth;
        ctx.lineCap = 'round';

        customizeUtil.canvas.bezierto(
            ctx,
            pin.x + offset.x,
            pin.y + offset.y,
            pout.x + offset.x,
            pout.y + offset.y);
    }
}


