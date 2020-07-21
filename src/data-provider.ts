import { logger } from './config';
import { customizeFormat } from './customize-format';

export class MindMapDataProvider {
    jm: any;

    constructor(jm) {
        this.jm = jm;
    }

    init() {
        logger.debug('data.init');
    }

    reset() {
        logger.debug('data.reset');
    }

    load(mind_data) {
        let df = null;
        let mind = null;
        if (typeof mind_data === 'object') {
            if (!!mind_data.format) {
                df = mind_data.format;
            } else {
                df = 'nodeTree';
            }
        } else {
            df = 'freemind';
        }

        if (df == 'node_array') {
            mind = customizeFormat.node_array.getMind(mind_data);
        } else if (df == 'nodeTree') {
            mind = customizeFormat.nodeTree.getMind(mind_data);
        } else if (df == 'freemind') {
            mind = customizeFormat.freemind.getMind(mind_data);
        } else {
            logger.warn('unsupported format');
        }
        return mind;
    }

    getData(data_format) {
        let data = null;
        if (data_format == 'node_array') {
            data = customizeFormat.node_array.getData(this.jm.mind);
        } else if (data_format == 'nodeTree') {
            data = customizeFormat.nodeTree.getData(this.jm.mind);
        } else if (data_format == 'freemind') {
            data = customizeFormat.freemind.getData(this.jm.mind);
        } else {
            logger.error('unsupported ' + data_format + ' format');
        }
        return data;
    }
}
