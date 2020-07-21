import { logger } from './config';
import { MindMapNode } from './mind-map-node';
import { customizeUtil } from './util';
import { MindMapMain } from './mind-map-main';

export class MindMapMind {
    name = null;
    author = null;
    version = null;
    root = null;
    selected = null;
    nodes = {};

    constructor() {

    }

    getNode(nodeid) {
        if (nodeid in this.nodes) {
            return this.nodes[nodeid];
        } else {
            logger.warn('the node[id=' + nodeid + '] can not be found');
            return null;
        }
    }

    setRoot(nodeid, topic, data) {
        if (this.root == null) {
            this.root = new MindMapNode(nodeid, 0, topic, data, true);
            this.putNode(this.root);
        } else {
            logger.error('root node is already exist');
        }
    }

    addNode(parent_node, nodeid, topic, data, idx, direction?, expanded?, selected_type?) {
        if (!customizeUtil.is_node(parent_node)) {
            return this.addNode(this.getNode(parent_node), nodeid, topic, data, idx, direction, expanded);
        }
        const nodeindex = idx || -1;

        if (!!parent_node) {
            //logger.debug(parent_node);
            let node = null;
            if (parent_node.isroot) {
                let d = MindMapMain.direction.right;
                if (isNaN(direction)) {
                    const children = parent_node.children;
                    const children_len = children.length;
                    let r = 0;
                    // for(var i=0;i<children_len;i++){if(children[i].direction === jm.direction.left){r--;}else{r++;}}
                    d = MindMapMain.direction.right
                } else {
                    d = (direction != MindMapMain.direction.left) ?
                        MindMapMain.direction.right :
                        MindMapMain.direction.left;
                }
                node =
                    new MindMapNode(nodeid, nodeindex, topic, data, false,
                        parent_node, d, expanded, selected_type, parent_node.level + 1);
            } else {
                node =
                    new MindMapNode(nodeid, nodeindex, topic, data, false,
                        parent_node, parent_node.direction, expanded, selected_type, parent_node.level + 1);
            }
            if (this.putNode(node)) {
                parent_node.children.push(node);
                this.reindex(parent_node);
            } else {
                logger.error('fail, the nodeid \'' + node.id + '\' has been already exist.');
                node = null;
            }
            return node;
        } else {
            logger.error('fail, the [node_parent] can not be found.');
            return null;
        }
    }

    insertNodeBefore(node_before, nodeid, topic, data) {
        if (!customizeUtil.is_node(node_before)) {
            return this.insertNodeBefore(this.getNode(node_before), nodeid, topic, data);
        }
        if (!!node_before) {
            const node_index = node_before.index - 0.5;
            return this.addNode(node_before.parent, nodeid, topic, data, node_index);
        } else {
            logger.error('fail, the [node_before] can not be found.');
            return null;
        }
    }


    getNodeBefore(node) {
        if (!node) {return null;}
        if (!customizeUtil.is_node(node)) {
            return this.getNodeBefore(this.getNode(node));
        }
        if (node.isroot) {return null;}
        const idx = node.index - 2;
        if (idx >= 0) {
            return node.parent.children[idx];
        } else {
            return null;
        }
    }


    insertNodeAfter(node_after, nodeid, topic, data) {
        if (!customizeUtil.is_node(node_after)) {
            return this.insertNodeAfter(this.getNode(node_after), nodeid, topic, data);
        }
        if (!!node_after) {
            const node_index = node_after.index + 0.5;
            return this.addNode(node_after.parent, nodeid, topic, data, node_index);
        } else {
            logger.error('fail, the [node_after] can not be found.');
            return null;
        }
    }

    getNodeAfter(node) {
        if (!node) {return null;}
        if (!customizeUtil.is_node(node)) {
            return this.getNodeAfter(this.getNode(node));
        }
        if (node.isroot) {return null;}
        const idx = node.index;
        const brothers = node.parent.children;
        if (brothers.length >= idx) {
            return node.parent.children[idx];
        } else {
            return null;
        }
    }

    moveNode(node, beforeid, parentid, direction) {
        if (!customizeUtil.is_node(node)) {
            return this.moveNode(this.getNode(node), beforeid, parentid, direction);
        }
        if (!parentid) {
            parentid = node.parent.id;
        }
        return this.moveNodeDirect(node, beforeid, parentid, direction);
    }

    flowNodeDirection(node, direction?) {
        if (typeof direction === 'undefined') {
            direction = node.direction;
        } else {
            node.direction = direction;
        }
        let len = node.children.length;
        while (len--) {
            this.flowNodeDirection(node.children[len], direction);
        }
    }


    moveNodeInternal(node, beforeid) {
        if (!!node && !!beforeid) {
            if (beforeid == '_last_') {
                node.index = -1;
                this.reindex(node.parent);
            } else if (beforeid == '_first_') {
                node.index = 0;
                this.reindex(node.parent);
            } else {
                const node_before = (!!beforeid) ? this.getNode(beforeid) : null;
                if (node_before != null && node_before.parent != null && node_before.parent.id == node.parent.id) {
                    node.index = node_before.index - 0.5;
                    this.reindex(node.parent);
                }
            }
        }
        return node;
    }

    moveNodeDirect(node, beforeid, parentid, direction) {
        if (!!node && !!parentid) {
            if (node.parent.id != parentid) {
                // remove from parent's children
                const sibling = node.parent.children;
                let si = sibling.length;
                while (si--) {
                    if (sibling[si].id == node.id) {
                        sibling.splice(si, 1);
                        break;
                    }
                }
                node.parent = this.getNode(parentid);
                node.parent.children.push(node);
            }

            if (node.parent.isroot) {
                if (direction == MindMapMain.direction.left) {
                    node.direction = direction;
                } else {
                    node.direction = MindMapMain.direction.right;
                }
            } else {
                node.direction = node.parent.direction;
            }
            this.moveNodeInternal(node, beforeid);
            this.flowNodeDirection(node);
        }
        return node;
    }

    removeNode(node) {
        if (!customizeUtil.is_node(node)) {
            return this.removeNode(this.getNode(node));
        }
        if (!node) {
            logger.error('fail, the node can not be found');
            return false;
        }
        if (node.isroot) {
            logger.error('fail, can not remove root node');
            return false;
        }
        if (this.selected != null && this.selected.id == node.id) {
            this.selected = null;
        }
        // clean all subordinate nodes
        const children = node.children;
        let ci = children.length;
        while (ci--) {
            this.removeNode(children[ci]);
        }
        // clean all children
        children.length = 0;
        // remove from parent's children
        const sibling = node.parent.children;
        let si = sibling.length;
        while (si--) {
            if (sibling[si].id == node.id) {
                sibling.splice(si, 1);
                break;
            }
        }
        // remove from global nodes
        delete this.nodes[node.id];
        // clean all properties
        for (let k in node) {
            delete node[k];
        }
        // remove it's self
        node = null;
        //delete node;
        return true;
    }

    putNode(node) {
        if (node.id in this.nodes) {
            logger.warn('the nodeid \'' + node.id + '\' has been already exist.');
            return false;
        } else {
            this.nodes[node.id] = node;
            return true;
        }
    }

    reindex(node) {
        if (node instanceof MindMapNode) {
            node.children.sort(MindMapNode.compare);
            const length = node.children.length;
            for (let i = 0; i < length; i++) {
                node.children[i].index = i + 1;
            }
        }
    }
}
