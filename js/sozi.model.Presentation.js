/*
 * Sozi - A presentation tool using the SVG standard
 *
 * Copyright (C) 2010-2013 Guillaume Savaton
 *
 * This program is dual licensed under the terms of the MIT license
 * or the GNU General Public License (GPL) version 3.
 * A copy of both licenses is provided in the doc/ folder of the
 * official release of Sozi.
 *
 * See http://sozi.baierouge.fr/wiki/en:license for details.
 */

namespace("sozi.model", function (exports) {
    "use strict";

    exports.Frame = sozi.model.Object.clone({

        // TODO define default properties separately
        frameId: "",
        title: "New frame",
        timeoutMs: 0,
        timeoutEnable: false,
        transitionDurationMs: 1000,
        showInFrameList: true,
        layerProperties: {own: []},
        cameraStates: {own: []},
        
        init: function (pres) {
            this.frameId = pres.makeFrameId();

            pres.layers.forEach(function () {
                this.cameraStates.push(sozi.player.CameraState.clone().init(pres.svgRoot));
                this.layerProperties.push(sozi.model.Object.clone({
                    clip: true,
                    referenceElementId: "",
                    referenceElementHide: true,
                    transitionTimingFunction: "linear",
                    transitionRelativeZoom: 0,
                    transitionPathId: "",
                    transitionPathHide: true
                }));
            }, this);

            return this;
        },

        get index() {
            return this.owner.frames.indexOf(this);
        },

        setAtStates: function (states) {
            states.forEach(function (state, index) {
                this.cameraStates.at(index).setAtState(state);
            }, this);
        }
    });

    exports.Layer = sozi.model.Object.clone({

        label: "",
        auto: false,
        svgNodes: [],
        
        init: function (label, auto) {
            this.label = label;
            this.auto = auto;
            return this;
        },

        get index() {
            return this.owner.layers.indexOf(this);
        },

        get isVisible() {
            return this.svgNodes.some(function (node) {
                return window.getComputedStyle(node).visibility === "visible";
            });
        },

        set isVisible(visible) {
            this.svgNodes.forEach(function (node) {
                node.style.visibility = visible ? "visible" : "hidden";
            });
            this.fire("change:isVisible");
        }
    });

    // Constant: the SVG namespace
    var SVG_NS = "http://www.w3.org/2000/svg";

    // Constant: the Inkscape namespace
    var INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape";

    // Constant: The SVG element names that can be found in layers
    var DRAWABLE_TAGS = [ "g", "image", "path", "rect", "circle",
        "ellipse", "line", "polyline", "polygon", "text", "clippath" ];

    exports.Presentation = sozi.model.Object.clone({

        svgRoot: null,
        frames: {own: []},
        layers: {own: []},
        
        /*
         * Initialize a Sozi document object.
         *
         * Returns:
         *    - The current presentation object.
         */
        init: function (svgRoot) {
            this.svgRoot = svgRoot;

            // Create an empty wrapper layer for elements that do not belong to a valid layer
            var autoLayer = exports.Layer.clone().init("auto", true);
            this.layers.push(autoLayer);

            var svgWrapper = document.createElementNS(SVG_NS, "g");

            // Get all child nodes of the SVG root.
            // Make a copy of svgRoot.childNodes before modifying the document.
            var svgNodeList = Array.prototype.slice.call(svgRoot.childNodes);

            svgNodeList.forEach(function (svgNode) {
                // Remove text nodes and comments
                if (svgNode.tagName === undefined) {
                    svgRoot.removeChild(svgNode);
                }
                // Reorganize SVG elements
                else {
                    var nodeName = svgNode.localName.toLowerCase();
                    var nodeId = svgNode.getAttribute("id");

                    if (DRAWABLE_TAGS.indexOf(nodeName) >= 0) {
                        // The current node is a valid layer if it has the following characteristics:
                        //    - it is an SVG group element
                        //    - it has an id that has not been met before
                        if (nodeName === "g" && nodeId !== null &&
                            this.layers.every(function (layer) { return layer.nodeId !== nodeId; })) {
                            // If the current wrapper layer contains elements,
                            // add it to the document and to the list of layers.
                            if (svgWrapper.firstChild) {
                                svgRoot.insertBefore(svgWrapper, svgNode);
                                autoLayer.svgNodes.push(svgWrapper);

                                // Create a new empty wrapper layer
                                svgWrapper = document.createElementNS(SVG_NS, "g");
                            }

                            // Add the current node as a new layer.
                            var layer = exports.Layer.clone().init(svgNode.hasAttribute("inkscape:label") ? svgNode.getAttribute("inkscape:label") : ("#" + nodeId), false);
                            layer.svgNodes.push(svgNode);
                            this.layers.push(layer);
                        }
                        else {
                            svgWrapper.appendChild(svgNode);
                        }
                    }
                }
            }, this);

            // If the current wrapper layer contains elements,
            // add it to the document and to the list of layers.
            if (svgWrapper.firstChild) {
                svgRoot.appendChild(svgWrapper);
                autoLayer.svgNodes.push(svgWrapper);
            }

            return this;
        },

        makeFrameId: function () {
            var prefix = "frame";
            var suffix = Math.floor(1000 * (1 + 9 * Math.random()));
            var frameId;
            do {
                frameId = prefix + suffix;
                suffix ++;
            } while (this.frames.some(function (frame) {
                return frame.frameId === frameId;
            }));
            return frameId;
        }
    });
});