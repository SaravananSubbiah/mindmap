import { customizeUtil } from './util';
import { $document } from './config';
import { MindMapMain } from './mind-map-main';


export class ShortcutProvider {
    jm;
    opts;
    mapping;
    handles;
    _mapping = {};

    constructor(jm, options) {
        this.jm = jm;
        this.opts = options;
        this.mapping = options.mapping;
        this.handles = options.handles;
    }

    init() {
        customizeUtil.dom.addEvent($document, 'keydown', this.handler.bind(this));

        this.handles['addchild'] = this.handleAddChild;
        this.handles['addbrother'] = this.handleAddBrother;
        this.handles['editnode'] = this.handleEditNode;
        this.handles['delnode'] = this.handleDelNode;
        this.handles['toggle'] = this.handleToggle;
        this.handles['up'] = this.handleUp;
        this.handles['down'] = this.handleDown;
        this.handles['left'] = this.handleLeft;
        this.handles['right'] = this.handleRight;

        for (const handle in this.mapping) {
            if (!!this.mapping[handle] && (handle in this.handles)) {
                this._mapping[this.mapping[handle]] = this.handles[handle];
            }
        }
    }

    enableShortcut() {
        this.opts.enable = true;
    }

    disableShortcut() {
        this.opts.enable = false;
    }

    handler(e) {
        if (this.jm.view.isEditing()) {return;}
        const evt = e || event;
        if (!this.opts.enable) {return true;}
        const kc = evt.keyCode;
        if (kc in this._mapping) {
            this._mapping[kc].call(this, this.jm, e);
        }
    }

    handleAddChild(_jm, e) {
        const selected_node = _jm.getSelectedNode();
        if (!!selected_node) {
            const nodeid = customizeUtil.uuid.newid();
            const node = _jm.addNode(selected_node, nodeid, 'New Node');
            if (!!node) {
                _jm.selectNode(nodeid);
                _jm.beginEdit(nodeid);
            }
        }
    }

    handleAddBrother(_jm, e) {
        const selected_node = _jm.getSelectedNode();
        if (!!selected_node && !selected_node.isroot) {
            const nodeid = customizeUtil.uuid.newid();
            const node = _jm.insertNodeAfter(selected_node, nodeid, 'New Node');
            if (!!node) {
                _jm.selectNode(nodeid);
                _jm.beginEdit(nodeid);
            }
        }
    }

    handleEditNode(_jm, e) {
        const selected_node = _jm.getSelectedNode();
        if (!!selected_node) {
            _jm.beginEdit(selected_node);
        }
    }

    handleDelNode(_jm, e) {
        const selected_node = _jm.getSelectedNode();
        if (!!selected_node && !selected_node.isroot) {
            _jm.selectNode(selected_node.parent);
            _jm.removeNode(selected_node);
        }
    }

    handleToggle(_jm, e) {
        const evt = e || event;
        const selected_node = _jm.getSelectedNode();
        if (!!selected_node) {
            _jm.toggleNode(selected_node.id);
            evt.stopPropagation();
            evt.preventDefault();
        }
    }

    handleUp(_jm, e) {
        const evt = e || event;
        const selected_node = _jm.getSelectedNode();
        if (!!selected_node) {
            let up_node = _jm.findNodeBefore(selected_node);
            if (!up_node) {
                const np = _jm.findNodeBefore(selected_node.parent);
                if (!!np && np.children.length > 0) {
                    up_node = np.children[np.children.length - 1];
                }
            }
            if (!!up_node) {
                _jm.selectNode(up_node);
            }
            evt.stopPropagation();
            evt.preventDefault();
        }
    }

    handleDown(_jm, e) {
        const evt = e || event;
        const selected_node = _jm.getSelectedNode();
        if (!!selected_node) {
            let down_node = _jm.findNodeAfter(selected_node);
            if (!down_node) {
                const np = _jm.findNodeAfter(selected_node.parent);
                if (!!np && np.children.length > 0) {
                    down_node = np.children[0];
                }
            }
            if (!!down_node) {
                _jm.selectNode(down_node);
            }
            evt.stopPropagation();
            evt.preventDefault();
        }
    }

    handleLeft(_jm, e) {
        this._handleDirection(_jm, e, MindMapMain.direction.left);
    }

    handleRight(_jm, e) {
        this._handleDirection(_jm, e, MindMapMain.direction.right);
    }

    _handleDirection(_jm, e, d) {
        const evt = e || event;
        const selected_node = _jm.getSelectedNode();
        let node = null;
        if (!!selected_node) {
            if (selected_node.isroot) {
                const c = selected_node.children;
                const children = [];
                for (let i = 0; i < c.length; i++) {
                    if (c[i].direction === d) {
                        children.push(i)
                    }
                }
                node = c[children[Math.floor((children.length - 1) / 2)]];
            }
            else if (selected_node.direction === d) {
                const children = selected_node.children;
                const childrencount = children.length;
                if (childrencount > 0) {
                    node = children[Math.floor((childrencount - 1) / 2)]
                }
            } else {
                node = selected_node.parent;
            }
            if (!!node) {
                _jm.selectNode(node);
            }
            evt.stopPropagation();
            evt.preventDefault();
        }
    }
}
