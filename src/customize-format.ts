import * as _ from 'lodash';
import { NAME, AUTHOR, VERSION, logger, $win } from './config';
import { MindMapMain } from './mind-map-main';
import { MindMapMind } from './mind-map-mind';
import { MindMapNode } from './mind-map-node';

export const customizeFormat = {
    nodeTree: {
        example: {
            meta: {
                name: NAME,
                author: AUTHOR,
                version: VERSION
            },
            format: "nodeTree",
            data: { id: "root", topic: "Main Node" }
        },
        getMind: function (source) {
            const df = customizeFormat.nodeTree;
            const mind = new MindMapMind();
            mind.name = _.get(source, 'meta.name', NAME);
            mind.author = _.get(source, 'meta.author', AUTHOR);
            mind.version = _.get(source, 'meta.version', VERSION);
            df._parse(mind, source.data);
            return mind;
        },
        getData: function (mind) {
            const df = customizeFormat.nodeTree;
            let json = { meta: {}, format: '', data: {} };
            json.meta = {
                name: mind.name,
                author: mind.author,
                version: mind.version
            };
            json.format = 'nodeTree';
            json.data = df._buildNode(mind.root);
            return json;
        },

        _parse: function (mind, node_root) {
            const df = customizeFormat.nodeTree;
            const data = df._extractData(node_root);
            mind.setRoot(node_root.id, node_root.topic, data);
            if ('children' in node_root) {
                const children = node_root.children;
                for (let i = 0; i < children.length; i++) {
                    df._extractSubNode(mind, mind.root, children[i]);
                }
            }
        },

        _extractData: function (node_json) {
            const data = {};
            for (let k in node_json) {
                if (k == 'id' ||
                    k == 'topic' ||
                    k == 'children' ||
                    k == 'direction' ||
                    k == 'expanded' ||
                    k == 'selectedType') {
                    continue;
                }
                if (k == 'backgroundColor') {
                    data['background-color'] = node_json[k];
                } else {
                    data[k] = node_json[k];
                }
            }
            return data;
        },

        _extractSubNode: function (mind, node_parent, node_json) {
            const df = customizeFormat.nodeTree;
            const data = df._extractData(node_json);
            let d = null;
            if (node_parent.isroot) {
                d = node_json.direction == 'left' ? MindMapMain.direction.left : MindMapMain.direction.right;
            }
            const node = mind.addNode(node_parent, node_json.id, node_json.topic, data, null, d, node_json.expanded, node_json.selectedType);
            if ('children' in node_json) {
                const children = node_json.children;
                for (let i = 0; i < children.length; i++) {
                    df._extractSubNode(mind, node, children[i]);
                }
            }
        },

        _buildNode: function (node) {
            const df = customizeFormat.nodeTree;
            if (!(node instanceof MindMapNode)) {return;}
            const o = {
                id: node.id,
                topic: node.topic,
                direction: '',
                children: [],
                selectedType: node.selectedType,
                isCreated: node.isCreated,
                isroot: node.isroot,
                expanded: node.expanded
            };
            if (!!node.parent && node.parent.isroot) {
                o.direction = node.direction == MindMapMain.direction.left ? 'left' : 'right';
            }
            if (node.data != null) {
                const node_data = node.data;
                for (let k in node_data) {
                    o[k] = node_data[k];
                }
            }
            const children = node.children;
            if (children.length > 0) {
                o.children = [];
                for (let i = 0; i < children.length; i++) {
                    o.children.push(df._buildNode(children[i]));
                }
            }
            return o;
        }
    },

    node_array: {
        example: {
            meta: {
                name: NAME,
                author: AUTHOR,
                version: VERSION
            },
            format: "node_array",
            data: [
                { id: "root", topic: "Main Node", isroot: true }
            ]
        },

        getMind: function (source) {
            const df = customizeFormat.node_array;
            const mind = new MindMapMind();
            mind.name = _.get(source, 'meta.name', NAME);
            mind.author = _.get(source, 'meta.author', AUTHOR);
            mind.version = _.get(source, 'meta.version', VERSION);
            df._parse(mind, source.data);
            return mind;
        },

        getData: function (mind) {
            const df = customizeFormat.node_array;
            const json = {
                meta: {},
                format: '',
                data: []
            };
            json.meta = {
                name: mind.name,
                author: mind.author,
                version: mind.version
            };
            json.format = 'node_array';
            json.data = [];
            df._array(mind, json.data);
            return json;
        },

        _parse: function (mind, node_array) {
            const df = customizeFormat.node_array;
            const narray = node_array.slice(0);
            // reverse array for improving looping performance
            narray.reverse();
            const root_id = df._extractRoot(mind, narray);
            if (!!root_id) {
                df._extractSubNode(mind, root_id, narray);
            } else {
                logger.error('root node can not be found');
            }
        },

        _extractRoot: function (mind, node_array) {
            const df = customizeFormat.node_array;
            let i = node_array.length;
            while (i--) {
                if ('isroot' in node_array[i] && node_array[i].isroot) {
                    const root_json = node_array[i];
                    const data = df._extractData(root_json);
                    mind.setRoot(root_json.id, root_json.topic, data);
                    node_array.splice(i, 1);
                    return root_json.id;
                }
            }
            return null;
        },

        _extractSubNode: function (mind, parentid, node_array) {
            const df = customizeFormat.node_array;
            let i = node_array.length;
            let node_json = null;
            let data = null;
            let extract_count = 0;
            while (i--) {
                node_json = node_array[i];
                if (node_json.parentid == parentid) {
                    data = df._extractData(node_json);
                    let d = null;
                    const node_direction = node_json.direction;
                    if (!!node_direction) {
                        d = node_direction == 'left' ? MindMapMain.direction.left : MindMapMain.direction.right;
                    }
                    mind.addNode(parentid, node_json.id, node_json.topic, data, null, d, node_json.expanded);
                    node_array.splice(i, 1);
                    extract_count++;
                    const sub_extract_count = df._extractSubNode(mind, node_json.id, node_array);
                    if (sub_extract_count > 0) {
                        // reset loop index after extract subordinate node
                        i = node_array.length;
                        extract_count += sub_extract_count;
                    }
                }
            }
            return extract_count;
        },

        _extractData: function (node_json) {
            const data = {};
            for (const k in node_json) {
                if (k == 'id' || k == 'topic' || k == 'parentid' || k == 'isroot' || k == 'direction' || k == 'expanded') {
                    continue;
                }
                data[k] = node_json[k];
            }
            return data;
        },

        _array: function (mind, node_array) {
            const df = customizeFormat.node_array;
            df._arrayNode(mind.root, node_array);
        },

        _arrayNode: function (node, node_array) {
            const df = customizeFormat.node_array;
            if (!(node instanceof MindMapNode)) {return;}
            const o = {
                id: node.id,
                topic: node.topic,
                parentid: '',
                isroot: false,
                direction: '',
                expanded: node.expanded
            };
            if (!!node.parent) {
                o.parentid = node.parent.id;
            }
            if (node.isroot) {
                o.isroot = true;
            }
            if (!!node.parent && node.parent.isroot) {
                o.direction = node.direction == MindMapMain.direction.left ? 'left' : 'right';
            }
            if (node.data != null) {
                const node_data = node.data;
                for (const k in node_data) {
                    o[k] = node_data[k];
                }
            }
            node_array.push(o);
            const ci = node.children.length;
            for (let i = 0; i < ci; i++) {
                df._arrayNode(node.children[i], node_array);
            }
        },
    },

    freemind: {
        example: {
            meta: {
                name: NAME,
                author: AUTHOR,
                version: VERSION
            },
            format: "freemind",
            data: "<map version=\"1.0.1\"><node ID=\"root\" TEXT=\"freemind Example\"/></map>"
        },
        getMind: function (source) {
            const df = customizeFormat.freemind;
            const mind = new MindMapMind();
            mind.name = _.get(source, 'meta.name', NAME);
            mind.author = _.get(source, 'meta.author', AUTHOR);
            mind.version = _.get(source, 'meta.version', VERSION);
            const xml = source.data;
            const xml_doc = df._parseXml(xml);
            const xml_root = df._findRoot(xml_doc);
            df._loadNode(mind, null, xml_root);
            return mind;
        },

        getData: function (mind) {
            const df = customizeFormat.freemind;
            const json = { meta: {}, format: '', data: '' };
            json.meta = {
                name: mind.name,
                author: mind.author,
                version: mind.version
            };
            json.format = 'freemind';
            const xmllines = [];
            xmllines.push('<map version=\"1.0.1\">');
            df._buildMap(mind.root, xmllines);
            xmllines.push('</map>');
            json.data = xmllines.join(' ');
            return json;
        },

        _parseXml: function (xml) {
            let xml_doc = null;
            if ($win.DOMParser) {
                const parser = new DOMParser();
                xml_doc = parser.parseFromString(xml, 'text/xml');
            } else { // Internet Explorer
                xml_doc = new ActiveXObject('Microsoft.XMLDOM');
                xml_doc.async = false;
                xml_doc.loadXML(xml);
            }
            return xml_doc;
        },

        _findRoot: function (xml_doc) {
            const nodes = xml_doc.childNodes;
            let node = null;
            let root = null;
            let n = null;
            for (let i = 0; i < nodes.length; i++) {
                n = nodes[i];
                if (n.nodeType == 1 && n.tagName == 'map') {
                    node = n;
                    break;
                }
            }
            if (!!node) {
                const ns = node.childNodes;
                node = null;
                for (let i = 0; i < ns.length; i++) {
                    n = ns[i];
                    if (n.nodeType == 1 && n.tagName == 'node') {
                        node = n;
                        break;
                    }
                }
            }
            return node;
        },

        _loadNode: function (mind, parent_id, xml_node) {
            const df = customizeFormat.freemind;
            const node_id = xml_node.getAttribute('ID');
            let node_topic = xml_node.getAttribute('TEXT');
            // look for richcontent
            if (node_topic == null) {
                const topic_children = xml_node.childNodes;
                let topic_child = null;
                for (let i = 0; i < topic_children.length; i++) {
                    topic_child = topic_children[i];
                    //logger.debug(topic_child.tagName);
                    if (topic_child.nodeType == 1 && topic_child.tagName === 'richcontent') {
                        node_topic = topic_child.textContent;
                        break;
                    }
                }
            }
            const node_data: { expanded?: string } = df._loadAttributes(xml_node);
            const node_expanded = ('expanded' in node_data) ? (node_data.expanded == 'true') : true;
            delete node_data.expanded;

            const node_position = xml_node.getAttribute('POSITION');
            let node_direction = null;
            if (!!node_position) {
                node_direction = node_position == 'left' ? MindMapMain.direction.left : MindMapMain.direction.right;
            }
            //logger.debug(node_position +':'+ node_direction);
            if (!!parent_id) {
                mind.addNode(parent_id, node_id, node_topic, node_data, null, node_direction, node_expanded);
            } else {
                mind.setRoot(node_id, node_topic, node_data);
            }
            const children = xml_node.childNodes;
            let child = null;
            for (let i = 0; i < children.length; i++) {
                child = children[i];
                if (child.nodeType == 1 && child.tagName == 'node') {
                    df._loadNode(mind, node_id, child);
                }
            }
        },

        _loadAttributes: function (xml_node) {
            const children = xml_node.childNodes;
            let attr = null;
            let attr_data = {};
            for (let i = 0; i < children.length; i++) {
                attr = children[i];
                if (attr.nodeType == 1 && attr.tagName === 'attribute') {
                    attr_data[attr.getAttribute('NAME')] = attr.getAttribute('VALUE');
                }
            }
            return attr_data;
        },

        _buildMap: function (node, xmllines) {
            const df = customizeFormat.freemind;
            let pos = null;
            if (!!node.parent && node.parent.isroot) {
                pos = node.direction === MindMapMain.direction.left ? 'left' : 'right';
            }
            xmllines.push('<node');
            xmllines.push('ID=\"' + node.id + '\"');
            if (!!pos) {
                xmllines.push('POSITION=\"' + pos + '\"');
            }
            xmllines.push('TEXT=\"' + node.topic + '\">');

            // store expanded status as an attribute
            xmllines.push('<attribute NAME=\"expanded\" VALUE=\"' + node.expanded + '\"/>');

            // for attributes
            const node_data = node.data;
            if (node_data != null) {
                for (const k in node_data) {
                    xmllines.push('<attribute NAME=\"' + k + '\" VALUE=\"' + node_data[k] + '\"/>');
                }
            }

            // for children
            const children = node.children;
            for (let i = 0; i < children.length; i++) {
                df._buildMap(children[i], xmllines);
            }

            xmllines.push('</node>');
        },
    },
};

