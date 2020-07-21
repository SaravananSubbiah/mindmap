import * as _ from 'lodash';
import { customizeUtil } from './util';
import { ShortcutProvider } from './shortcut-provider';
import { $win, DEFAULT_OPTIONS, logger, VERSION } from './config';
import { MindMapDataProvider } from './data-provider';
import { LayoutProvider } from './layout-provider';
import { customizeFormat } from './customize-format';
import { ViewProvider } from './view-provider';
import { Subject } from 'rxjs';
import { MindMapMind } from './mind-map-mind';
import { Draggable } from './plugin/draggable';

export interface MindMapModuleOptsView {
    hmargin: number;
    vmargin: number;
    lineWidth: number;
    lineColor: string;
}

export interface MindMapModuleOptsDefaultEventHandle {
    canHandleMouseDown: boolean;
    canHandleClick: boolean;
    canHandleDblclick: boolean;
}

export interface MindMapModuleOpts {
    container?: string;
    mode?: any;
    layout?: any;
    supportHtml?: any;
    view?: MindMapModuleOptsView;
    shortcut?: any;
    editable?: boolean;
    defaultEventHandle?: MindMapModuleOptsDefaultEventHandle;
    theme?: any;
    depth?: number;
    canRootNodeEditable?: boolean;
    hasInteraction?: boolean;
    hierarchyRule?: { ROOT: any, [propName: string]: { name: string, getChildren: any } };
    enableDraggable?: boolean;
}


export class MindMapMain {

    version: string = VERSION;
    opts: MindMapModuleOpts = {};
    options = this.opts;
    inited = false;
    mind: MindMapMind;
    eventHandles = [];
    static direction;
    static eventType;
    data: MindMapDataProvider;
    layout: LayoutProvider;
    view: ViewProvider;
    shortcut;
    mindMapDataTransporter = new Subject<any>();
    mindMapDataReceiver = new Subject<any>();

    static plugin;
    static plugins;
    static registerPlugin;
    static initPluginsNextTick;
    static initPlugins;
    static show;


    constructor(options) {
        customizeUtil.json.merge(this.opts, DEFAULT_OPTIONS);
        customizeUtil.json.merge(this.opts, options);
        if (this.opts.container == null || this.opts.container.length == 0) {
            logger.error('the options.container should not be empty.');
            return;
        }
        this.init();
    }


    init() {
        if (this.inited) {return;}
        this.inited = true;

        const opts = this.options;

        const optsLayout = {
            mode: opts.mode,
            hspace: opts.layout.hspace,
            vspace: opts.layout.vspace,
            pspace: opts.layout.pspace
        };
        const optsView = {
            container: opts.container,
            supportHtml: opts.supportHtml,
            hmargin: opts.view.hmargin,
            vmargin: opts.view.vmargin,
            lineWidth: opts.view.lineWidth,
            lineColor: opts.view.lineColor,
        };
        // create instance of function provider
        this.data = new MindMapDataProvider(this);
        this.layout = new LayoutProvider(this, optsLayout);
        this.view = new ViewProvider(this, optsView);
        this.shortcut = new ShortcutProvider(this, opts.shortcut);

        this.data.init();
        this.layout.init();
        this.view.init();
        this.shortcut.init();

        this.eventBind();

        MindMapMain.initPluginsNextTick(this);
        if (this.options.enableDraggable) {
            this.options.enableDraggable = false;
            this.registerPlugin();
        }


    }

    registerPlugin() {
        const draggablePlugin = new MindMapMain.plugin('draggable', function (jm) {
            const jd = new Draggable(jm);
            jd.init();
            jm.addEventListener(function (type, data) {
                jd.jm_event_handle.call(jd, type, data);
            });
        });

        MindMapMain.registerPlugin(draggablePlugin);
    }

    enableEdit() {
        this.options.editable = true;
    }

    disableEdit() {
        this.options.editable = false;
    }

    // call enableEventHandle('dblclick')
    // options are 'mousedown', 'click', 'dblclick'
    enableEventHandle(event_handle) {
        this.options.defaultEventHandle['can' + event_handle + 'Handle'] = true;
    }

    // call disableEventHandle('dblclick')
    // options are 'mousedown', 'click', 'dblclick'
    disableEventHandle(event_handle) {
        this.options.defaultEventHandle['can' + event_handle + 'Handle'] = false;
    }

    getEditable() {
        return this.options.editable;
    }

    getNodeEditable(node) {
        return !(!this.options.canRootNodeEditable && node.isroot);
    }

    setTheme(theme) {
        const theme_old = this.options.theme;
        this.options.theme = (!!theme) ? theme : null;
        if (theme_old != this.options.theme) {
            this.view.resetTheme();
            this.view.resetCustomStyle();
        }
    }

    eventBind() {
        this.view.addEvent(this, 'mousedown', this.mouseDownHandle);
        this.view.addEvent(this, 'click', this.clickHandle);
        this.view.addEvent(this, 'dblclick', this.dblclickHandle);
    }

    mouseDownHandle(e) {
        if (!this.options.defaultEventHandle.canHandleMouseDown) {
            return;
        }
        const element = e.target || event.srcElement;
        const nodeid = this.view.getBindedNodeId(element);
        if (!!nodeid) {
            this.selectNode(nodeid);
        } else {
            this.selectClear();
        }
    }

    clickHandle(e) {
        if (!this.options.defaultEventHandle.canHandleClick) {
            return;
        }
        const element = e.target || event.srcElement;
        const isexpander = this.view.isExpander(element);
        if (isexpander) {
            const nodeid = this.view.getBindedNodeId(element);
            if (!!nodeid) {
                this.toggleNode(nodeid);
            }
        }
    }

    dblclickHandle(e) {
        if (!this.options.defaultEventHandle.canHandleDblclick) {
            return;
        }
        if (this.getEditable()) {
            const element = e.target || event.srcElement;
            const nodeid = this.view.getBindedNodeId(element);
            if (!!nodeid && nodeid !== 'root') {
                this.beginEdit(nodeid);
            }
        }
    }

    getSelectTypesByHierarchyRule(node?) {
        if (!this.options.hierarchyRule) {
            return null;
        }
        const types = [];
        types.push(_.get(node, 'selectedType'));
        const parent_select_type = _.get(node, 'parent.selectedType');
        let current_rule = _.find(this.options.hierarchyRule, { name: parent_select_type });
        if (!current_rule) {
            current_rule = this.options.hierarchyRule.ROOT;
        }
        current_rule.getChildren().forEach(children => {
            types.push(children.name);
        });
        return _.compact(types);
    }

    beginEdit(node) {
        if (!customizeUtil.is_node(node)) {
            return this.beginEdit(this.getNode(node));
        }
        if (this.getEditable() && this.getNodeEditable(node)) {
            if (!!node) {
                this.view.editNodeBegin(node, this.getSelectTypesByHierarchyRule(node));
            } else {
                logger.error('the node can not be found');
            }
        } else {
            logger.error('fail, this mind map is not editable.');
            return;
        }
    }

    endEdit() {
        this.view.editNodeEnd();
    }

    toggleNode(node) {
        if (!customizeUtil.is_node(node)) {
            return this.toggleNode(this.getNode(node));
        }
        if (!!node) {
            if (node.isroot) {return;}
            this.view.saveLocation(node);
            this.layout.toggleNode(node);
            this.view.relayout();
            this.view.restoreLocation(node);
        } else {
            logger.error('the node can not be found.');
        }
    }

    expandNode(node) {
        if (!customizeUtil.is_node(node)) {
            return this.expandNode(this.getNode(node));
        }
        if (!!node) {
            if (node.isroot) {return;}
            this.view.saveLocation(node);
            this.layout.expandNode(node);
            this.view.relayout();
            this.view.restoreLocation(node);
        } else {
            logger.error('the node can not be found.');
        }
    }

    collapseNode(node) {
        if (!customizeUtil.is_node(node)) {
            return this.collapseNode(this.getNode(node));
        }
        if (!!node) {
            if (node.isroot) {return;}
            this.view.saveLocation(node);
            this.layout.collapseNode(node);
            this.view.relayout();
            this.view.restoreLocation(node);
        } else {
            logger.error('the node can not be found.');
        }
    }

    expandAll() {
        this.layout.expandAll();
        this.view.relayout();
    }

    collapseAll() {
        this.layout.collapseAll();
        this.view.relayout();
    }

    expandToDepth(depth) {
        this.layout.expandToDepth(depth);
        this.view.relayout();
    }

    _reset() {
        this.view.reset();
        this.layout.reset();
        this.data.reset();
    }

    _show(mind) {
        const m = mind || customizeFormat.node_array.example;

        this.mind = this.data.load(m);
        if (!this.mind) {
            logger.error('data.load error');
            return;
        } else {
            logger.debug('data.load ok');
        }

        this.view.load();
        logger.debug('view.load ok');

        this.layout.layout();
        logger.debug('layout.layout ok');

        this.view.show(true);
        logger.debug('view.show ok');

        this.invokeEventHandleNextTick(MindMapMain.eventType.show, { data: [mind] });
    }

    // show entrance
    show(mind) {
        this._reset();
        this._show(mind);
    }

    getMeta() {
        return {
            name: this.mind.name,
            author: this.mind.author,
            version: this.mind.version
        };
    }

    getData(data_format?) {
        const df = data_format || 'nodeTree';
        return this.data.getData(df);
    }

    getDepth() {
        const currentData = this.getData().data;
        const getDepth = (data) => {
            let depth = 1;
            if (data.children && data.children[0]) {
                const childrenDepth = [];
                const childrenLength = data.children.length;
                for (let i = 0; i < childrenLength; i++) {
                    childrenDepth.push(getDepth(data.children[i]));
                }
                return depth + _.max(childrenDepth);
            }
            return depth;
        };
        return getDepth(currentData);
    }

    getRoot() {
        return this.mind.root;
    }

    getNode(nodeid) {
        return this.mind.getNode(nodeid);
    }

    getCurrentHierarchyRule(parent_node) {
        if (!this.options.hierarchyRule) {
            return null;
        }
        if (parent_node.isroot) {
            return this.options.hierarchyRule.ROOT.getChildren()[0];
        }
        return _.find(this.options.hierarchyRule, { name: parent_node.selectedType }).getChildren()[0];
    }

    addNode(parent_node, nodeid, topic, data) {
        data = data || {};
        data.isCreated = true;
        if (this.options.depth && (parent_node.level >= this.options.depth)) {
            throw new Error('over depth');
        }
        if (this.getEditable()) {
            const current_rule = this.getCurrentHierarchyRule(parent_node);
            const selected_type = current_rule && current_rule.name;
            if (!selected_type && this.options.hierarchyRule) {
                throw new Error('forbidden add');
            } else {
                topic = topic || `${selected_type}的名称`;
            }
            if (current_rule.backgroundColor) {
                data['background-color'] = current_rule.backgroundColor;
            }
            if (current_rule.color) {
                data['color'] = current_rule.color;
            }
            const node = this.mind.addNode(parent_node, nodeid, topic, data, null, null, null, selected_type);
            if (!!node) {
                this.view.addNode(node);
                this.layout.layout();
                this.view.show(false);
                this.view.resetNodeCustomStyle(node);
                this.expandNode(parent_node);
                this.invokeEventHandleNextTick(MindMapMain.eventType.edit, {
                    evt: 'addNode',
                    data: [parent_node.id, nodeid, topic, data],
                    node: nodeid
                });
            }
            return node;
        } else {
            logger.error('fail, this mind map is not editable');
            return null;
        }
    }

    insertNodeBefore(node_before, nodeid, topic, data) {
        if (this.getEditable()) {
            const beforeid = customizeUtil.is_node(node_before) ? node_before.id : node_before;
            const node = this.mind.insertNodeBefore(node_before, nodeid, topic, data);
            if (!!node) {
                this.view.addNode(node);
                this.layout.layout();
                this.view.show(false);
                this.invokeEventHandleNextTick(MindMapMain.eventType.edit, {
                    evt: 'insertNodeBefore',
                    data: [beforeid, nodeid, topic, data],
                    node: nodeid
                });
            }
            return node;
        } else {
            logger.error('fail, this mind map is not editable');
            return null;
        }
    }

    insertNodeAfter(node_after, nodeid, topic, data) {
        if (this.getEditable()) {
            const node = this.mind.insertNodeAfter(node_after, nodeid, topic, data);
            if (!!node) {
                this.view.addNode(node);
                this.layout.layout();
                this.view.show(false);
                this.invokeEventHandleNextTick(MindMapMain.eventType.edit, {
                    evt: 'insertNodeAfter',
                    data: [node_after.id, nodeid, topic, data],
                    node: nodeid
                });
            }
            return node;
        } else {
            logger.error('fail, this mind map is not editable');
            return null;
        }
    }

    removeNode(node) {
        if (!customizeUtil.is_node(node)) {
            return this.removeNode(this.getNode(node));
        }
        if (this.getEditable()) {
            if (!!node) {
                if (node.isroot) {
                    logger.error('fail, can not remove root node');
                    return false;
                }
                const nodeid = node.id;
                const parentid = node.parent.id;
                const parent_node = this.getNode(parentid);
                this.view.saveLocation(parent_node);
                this.view.removeNode(node);
                this.mind.removeNode(node);
                this.layout.layout();
                this.view.show(false);
                this.view.restoreLocation(parent_node);
                this.invokeEventHandleNextTick(MindMapMain.eventType.edit, {
                    evt: 'removeNode',
                    data: [nodeid],
                    node: parentid
                });
            } else {
                logger.error('fail, node can not be found');
                return false;
            }
        } else {
            logger.error('fail, this mind map is not editable');
            return;
        }
    }

    updateNode(nodeid, topic, selected_type) {
        if (this.getEditable()) {
            if (customizeUtil.text.isEmpty(topic)) {
                logger.warn('fail, topic can not be empty');
                return;
            }
            const node = this.getNode(nodeid);
            if (!!node) {
                if (node.topic === topic && node.selectedType === selected_type) {
                    logger.info('nothing changed');
                    this.view.updateNode(node);
                    return;
                }
                node.topic = topic;
                node.selectedType = selected_type;
                this.view.updateNode(node);
                this.layout.layout();
                this.view.show(false);
                this.invokeEventHandleNextTick(MindMapMain.eventType.edit, {
                    evt: 'updateNode',
                    data: [nodeid, topic],
                    node: nodeid
                });
            }
        } else {
            logger.error('fail, this mind map is not editable');
            return;
        }
    }

    moveNode(nodeid, beforeid, parentid, direction) {
        if (this.getEditable()) {
            const node = this.mind.moveNode(nodeid, beforeid, parentid, direction);
            if (!!node) {
                this.view.updateNode(node);
                this.layout.layout();
                this.view.show(false);
                this.invokeEventHandleNextTick(MindMapMain.eventType.edit, {
                    evt: 'moveNode',
                    data: [nodeid, beforeid, parentid, direction],
                    node: nodeid
                });
            }
        } else {
            logger.error('fail, this mind map is not editable');
            return;
        }
    }

    selectNode(node) {
        if (!customizeUtil.is_node(node)) {
            return this.selectNode(this.getNode(node));
        }
        if (!node || !this.layout.isVisible(node)) {
            return;
        }
        this.mind.selected = node;
        if (!!node) {
            this.view.selectNode(node);
        }
    }

    getSelectedNode() {
        if (!!this.mind) {
            return this.mind.selected;
        } else {
            return null;
        }
    }

    selectClear() {
        if (!!this.mind) {
            this.mind.selected = null;
            this.view.selectClear();
        }
    }

    isNodeVisible(node) {
        return this.layout.isVisible(node);
    }

    findNodeBefore(node) {
        if (!customizeUtil.is_node(node)) {
            return this.findNodeBefore(this.getNode(node));
        }
        if (!node || node.isroot) {return null;}
        let n = null;
        if (node.parent.isroot) {
            const c = node.parent.children;
            let prev = null;
            let ni = null;
            for (let i = 0; i < c.length; i++) {
                ni = c[i];
                if (node.direction === ni.direction) {
                    if (node.id === ni.id) {
                        n = prev;
                    }
                    prev = ni;
                }
            }
        } else {
            n = this.mind.getNodeBefore(node);
        }
        return n;
    }

    findNodeAfter(node) {
        if (!customizeUtil.is_node(node)) {
            return this.findNodeAfter(this.getNode(node));
        }
        if (!node || node.isroot) {return null;}
        let n = null;
        if (node.parent.isroot) {
            const c = node.parent.children;
            let getthis = false;
            let ni = null;
            for (let i = 0; i < c.length; i++) {
                ni = c[i];
                if (node.direction === ni.direction) {
                    if (getthis) {
                        n = ni;
                        break;
                    }
                    if (node.id === ni.id) {
                        getthis = true;
                    }
                }
            }
        } else {
            n = this.mind.getNodeAfter(node);
        }
        return n;
    }

    setNodeColor(nodeid, bgcolor, fgcolor) {
        if (this.getEditable()) {
            const node = this.mind.getNode(nodeid);
            if (!!node) {
                if (!!bgcolor) {
                    node.data['background-color'] = bgcolor;
                }
                if (!!fgcolor) {
                    node.data['foreground-color'] = fgcolor;
                }
                this.view.resetNodeCustomStyle(node);
            }
        } else {
            logger.error('fail, this mind map is not editable');
            return null;
        }
    }

    setNodeFontStyle(nodeid, size, weight, style) {
        if (this.getEditable()) {
            const node = this.mind.getNode(nodeid);
            if (!!node) {
                if (!!size) {
                    node.data['font-size'] = size;
                }
                if (!!weight) {
                    node.data['font-weight'] = weight;
                }
                if (!!style) {
                    node.data['font-style'] = style;
                }
                this.view.resetNodeCustomStyle(node);
                this.view.updateNode(node);
                this.layout.layout();
                this.view.show(false);
            }
        } else {
            logger.error('fail, this mind map is not editable');
            return null;
        }
    }

    setNodeBackgroundImage(nodeid, image, width, height, rotation) {
        if (this.getEditable()) {
            const node = this.mind.getNode(nodeid);
            if (!!node) {
                if (!!image) {
                    node.data['background-image'] = image;
                }
                if (!!width) {
                    node.data['width'] = width;
                }
                if (!!height) {
                    node.data['height'] = height;
                }
                if (!!rotation) {
                    node.data['background-rotation'] = rotation;
                }
                this.view.resetNodeCustomStyle(node);
                this.view.updateNode(node);
                this.layout.layout();
                this.view.show(false);
            }
        } else {
            logger.error('fail, this mind map is not editable');
            return null;
        }
    }

    setNodeBackgroundRotation(nodeid, rotation) {
        if (this.getEditable()) {
            const node = this.mind.getNode(nodeid);
            if (!!node) {
                if (!node.data['background-image']) {
                    logger.error('fail, only can change rotation angle of node with background image');
                    return null;
                }
                node.data['background-rotation'] = rotation;
                this.view.resetNodeCustomStyle(node);
                this.view.updateNode(node);
                this.layout.layout();
                this.view.show(false);
            }
        } else {
            logger.error('fail, this mind map is not editable');
            return null;
        }
    }

    resize() {
        this.view.resize();
    }

    // callback(type ,data)
    addEventListener(callback) {
        if (typeof callback === 'function') {
            this.eventHandles.push(callback);
        }
    }

    invokeEventHandleNextTick(type, data) {
        const j = this;
        $win.setTimeout(function () {
            j.invokeEventHandle(type, data);
        }, 0);
    }

    invokeEventHandle(type, data) {
        const l = this.eventHandles.length;
        for (let i = 0; i < l; i++) {
            this.eventHandles[i](type, data);
        }
    }
}

MindMapMain.direction = { left: -1, center: 0, right: 1 };
MindMapMain.eventType = { show: 1, resize: 2, edit: 3, select: 4 };

MindMapMain.plugin = function (name, init) {
    this.name = name;
    this.init = init;
};

MindMapMain.plugins = [];

MindMapMain.registerPlugin = function (plugin) {
    if (plugin instanceof MindMapMain.plugin) {
        MindMapMain.plugins.push(plugin);
    }
};

MindMapMain.initPluginsNextTick = function (sender) {
    $win.setTimeout(function () {
        MindMapMain.initPlugins(sender);
    }, 0);
};

MindMapMain.initPlugins = function (sender) {
    let l = MindMapMain.plugins.length;
    let fn_init = null;
    for (let i = 0; i < l; i++) {
        fn_init = MindMapMain.plugins[i].init;
        if (typeof fn_init === 'function') {
            fn_init(sender);
        }
    }
};

// quick way
MindMapMain.show = function (options, mind) {
    let _jm = new MindMapMain(options);
    _jm.show(mind);
    return _jm;
};
