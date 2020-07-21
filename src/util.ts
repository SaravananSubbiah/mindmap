import { logger, $create, $document, $win } from './config';
import { MindMapNode } from './mind-map-node';

export const customizeUtil = {
    is_node: function (node) {
        return node instanceof MindMapNode;
    },
    ajax: {
        _xhr: function () {
            let xhr = null;
            if ($win.XMLHttpRequest) {
                xhr = new XMLHttpRequest();
            } else {
                try {
                    xhr = new ActiveXObject('Microsoft.XMLHTTP');
                } catch (e) { }
            }
            return xhr;
        },
        _eurl: function (url) {
            return encodeURIComponent(url);
        },
        request: function (url, param, method, callback, fail_callback?) {
            let a = customizeUtil.ajax;
            let p = null;
            let tmp_param = [];
            for (let k in param) {
                tmp_param.push(a._eurl(k) + '=' + a._eurl(param[k]));
            }
            if (tmp_param.length > 0) {
                p = tmp_param.join('&');
            }
            let xhr = a._xhr();
            if (!xhr) { return; }
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200 || xhr.status == 0) {
                        if (typeof callback === 'function') {
                            let data = customizeUtil.json.string2json(xhr.responseText);
                            if (data != null) {
                                callback(data);
                            } else {
                                callback(xhr.responseText);
                            }
                        }
                    } else {
                        if (typeof fail_callback === 'function') {
                            fail_callback(xhr);
                        } else {
                            logger.error('xhr request failed.', xhr);
                        }
                    }
                }
            }
            method = method || 'GET';
            xhr.open(method, url, true);
            xhr.setRequestHeader('If-Modified-Since', '0');
            if (method == 'POST') {
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=utf-8');
                xhr.send(p);
            } else {
                xhr.send();
            }
        },
        get: function (url, callback) {
            return customizeUtil.ajax.request(url, {}, 'GET', callback);
        },
        post: function (url, param, callback) {
            return customizeUtil.ajax.request(url, param, 'POST', callback);
        }
    },

    dom: {
        //target,eventType,handler
        addEvent: function (t, e, h) {
            if (!!t.addEventListener) {
                t.addEventListener(e, h, false);
            } else {
                t.attachEvent('on' + e, h);
            }
        }
    },

    canvas: {
        bezierto: function (ctx, x1, y1, x2, y2) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(x1 + (x2 - x1) * 2 / 3, y1, x1, y2, x2, y2);
            ctx.stroke();
        },
        lineto: function (ctx, x1, y1, x2, y2) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        },
        clear: function (ctx, x, y, w, h) {
            ctx.clearRect(x, y, w, h);
        }
    },

    file: {
        read: function (file_data, fn_callback) {
            let reader = new FileReader();
            reader.onload = function () {
                if (typeof fn_callback === 'function') {
                    fn_callback(this.result, file_data.name);
                }
            };
            reader.readAsText(file_data);
        },

        save: function (file_data, type, name) {
            let blob;
            if (typeof $win.Blob === 'function') {
                blob = new Blob([file_data], { type: type });
            } else {
                let BlobBuilder = $win.BlobBuilder || $win.MozBlobBuilder || $win.WebKitBlobBuilder || $win.MSBlobBuilder;
                let bb = new BlobBuilder();
                bb.append(file_data);
                blob = bb.getBlob(type);
            }
            if (navigator.msSaveBlob) {
                navigator.msSaveBlob(blob, name);
            } else {
                let URL = $win.URL || $win.webkitURL;
                let bloburl = URL.createObjectURL(blob);
                let anchor = $create('a');
                if ('download' in anchor) {
                    anchor.style.visibility = 'hidden';
                    anchor.href = bloburl;
                    anchor.download = name;
                    $document.body.appendChild(anchor);
                    let evt = $document.createEvent('MouseEvents');
                    evt.initEvent('click', true, true);
                    anchor.dispatchEvent(evt);
                    $document.body.removeChild(anchor);
                } else {
                    location.href = bloburl;
                }
            }
        }
    },

    json: {
        json2string: function (json) {
            if (!!JSON) {
                try {
                    let json_str = JSON.stringify(json);
                    return json_str;
                } catch (e) {
                    logger.warn(e);
                    logger.warn('can not convert to string');
                    return null;
                }
            }
        },
        string2json: function (json_str) {
            if (!!JSON) {
                try {
                    let json = JSON.parse(json_str);
                    return json;
                } catch (e) {
                    logger.warn(e);
                    logger.warn('can not parse to json');
                    return null;
                }
            }
        },
        merge: function (b, a) {
            for (let o in a) {
                if (o in b) {
                    if (typeof b[o] === 'object' &&
                        Object.prototype.toString.call(b[o]).toLowerCase() == '[object object]' && !b[o].length) {
                        customizeUtil.json.merge(b[o], a[o]);
                    } else {
                        b[o] = a[o];
                    }
                } else {
                    b[o] = a[o];
                }
            }
            return b;
        }
    },

    uuid: {
        newid: function () {
            return (new Date().getTime().toString(16) + Math.random().toString(16).substr(2)).substr(2, 16);
        }
    },

    text: {
        isEmpty: function (s) {
            if (!s) { return true; }
            return s.replace(/\s*/, '').length == 0;
        }
    }
};
