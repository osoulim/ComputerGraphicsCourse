var nullFunc = function() {};

var sin = Math.sin,
    cos = Math.cos,
    PI = Math.PI;

Math.cbrt =
    Math.cbrt ||
    function(x) {
        //from https://developer.mozilla.org/ca/docs/Web/JavaScript/Referencia/Objectes_globals/Math/cbrt
        var y = Math.pow(Math.abs(x), 1 / 3);
        return x < 0 ? -y : y;
    };

// map({ k₀: v₀, k₁: v₁, ..., kᵢ: vᵢ }, f)  ->  { k₀: f(v₀, k₀), k₁: f(v₁, k₁), ..., kᵢ: f(vᵢ, kᵢ) }
var map = function(object, f) {
    var out = {};
    Object.keys(object).forEach(function(key) {
        out[key] = f(object[key], key);
    });
    return out;
};

// mapp([ v₀, v₁, ..., vᵢ ], f)  ->  { v₀: f(v₀, 0), v₁: f(v₁, 1), ..., vᵢ: f(vᵢ, i) }
var mapp = function(array, f) {
    var out = {};
    Object.keys(array).forEach(function(key) {
        out[array[key]] = f(array[key], key);
    });
    return out;
};

// Returns an array of consecutive integers (assumes α < β)
// list(α, β)  ->  [ α, α+1, ..., β ]
var list = function(α, β) {
    var out = new Array(β - α),
        i = 0;
    while (α <= β) out[i++] = α++;
    return out;
};

// merge({ a: 'x', b: 'z' }, { b: 'y', c: 'y' })  ->  { a: 'x', b: 'y', c: 'y' }
var merge = function(/* Object, Object, ... */) {
    var out = {};
    for (var i = 0; i < arguments.length; i++) {
        var object = arguments[i];
        if (!object) continue;
        Object.keys(object).forEach(function(property) {
            out[property] = object[property];
        });
    }
    return out;
};

// flattenArray([ [ a, b ], c ])  ->  [ a, b, c ]
var flattenArray = function(array) {
    return [].concat.apply([], array);
};

var initGL = function(canvas, options) {
    var gl;
    ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"].some(function(
        name
    ) {
        try {
            gl = canvas.getContext(name, options);
        } catch (e) {}
        return gl;
    });
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
        return;
    }

    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);

    return gl;
};

var loadFiles = function(files, onLoad) {
    console.info("Loading Shaders");
    var out = {};
    var loadFile = function(files) {
        var keys = Object.keys(files);
        var key = keys[0];
        if (keys.length === 0) return false;

        console.info("\t" + key + ": '" + files[key] + "'");

        var ajax = new XMLHttpRequest();
        ajax.open("GET", files[key], true);
        delete files[key];
        ajax.onload = function() {
            out[key] = ajax.responseText;

            if (!loadFile(files)) onLoad(out);
        };
        ajax.send();

        return true;
    };
    loadFile(files);
};

var loadImages = function(textures, onLoad) {
    console.info("Loading Images");
    var out = {};
    var loadImage = function(textures) {
        var keys = Object.keys(textures);
        var name = keys[0];
        if (keys.length === 0) return false;

        var imagesrc = textures[name];
        delete textures[name];

        var image = new Image();
        image.onload = function() {
            console.info("\t" + name + ": '" + imagesrc + "'");
            out[name] = image;
            if (!loadImage(textures)) onLoad(out);
        };
        image.src = imagesrc;

        return true;
    };
    loadImage(textures);
};

var loadTextures = function(gl, textures) {
    return map(textures, function(image, name) {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(
            gl.TEXTURE_2D,
            gl.TEXTURE_MIN_FILTER,
            gl.LINEAR_MIPMAP_LINEAR
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
        texture.ready = true;
        return texture;
    });
};

var setUniforms = function(gl, program, data) {
    Object.keys(data).forEach(function(key) {
        if (data[key].type == gl.uniformMatrix4fv)
            gl.uniformMatrix4fv(program.uniforms[key], false, data[key].data);
        else if (data[key].type == gl.uniform1i)
            gl.uniform1i(program.uniforms[key], data[key].data);
        else if (data[key].type == gl.uniform4fv)
            gl.uniform4fv(program.uniforms[key], data[key].data);
    });
};

var createPrograms = function(gl, shaders, shaderSources) {
    return map(shaders, function(config, programName) {
        var program = gl.createProgram();

        console.info("Creating program: " + programName);

        //create, compile .etc the vertex and fragment shaders
        program.shaders = map(
            {
                vertex: gl.VERTEX_SHADER,
                fragment: gl.FRAGMENT_SHADER
            },
            function(type, t) {
                if (!config[t]) return;

                var shaderSource = shaderSources[config[t]];
                var shader = gl.createShader(type);
                gl.shaderSource(shader, shaderSource);
                gl.compileShader(shader);
                gl.attachShader(program, shader);

                console.info("\tCompiling " + t + " shader: " + config[t]);
                var log = gl.getShaderInfoLog(shader);
                if (log) console.error(log);
                return shader;
            }
        );

        //link the program
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            return;
            console.error("Could not initialise shaders");
        } else console.info("\tSuccess!");

        program.attributes = mapp(config.attributes, function(name) {
            return gl.getAttribLocation(program, name);
        });
        program.uniforms = mapp(config.uniforms, function(name) {
            return gl.getUniformLocation(program, name);
        });

        return program;
    });
};

var createBuffer = function(gl, config) {
    config.buffer = gl.createBuffer();

    gl.bindBuffer(config.target, config.buffer);
    gl.bufferData(config.target, config.data, gl.STATIC_DRAW);

    return config;
};

function arcballVector(point) {
    const mSquared = point.x * point.x + point.y * point.y;
    if (mSquared <= 1) {
        //on arcball
        return [point.x, point.y, Math.sqrt(1 - mSquared)];
    } else {
        //nearest point
        const s = Math.sqrt(mSquared);
        return [point.x / s, point.y / s, 0];
    }
}

var drawShape = function(gl, shape, uniforms) {
    var program = shape.program;
    gl.useProgram(program);
    uniforms = merge(uniforms, shape.uniforms);

    if (shape.textures)
        map(shape.textures, function(texture, name) {
            if (!texture || !texture.ready) return;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            uniforms[name] = { data: 0, type: gl.uniform1i };
        });

    setUniforms(gl, program, uniforms);

    if (shape.alpha) {
        gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA);
        gl.enable(gl.BLEND);
    }

    map(shape.buffers, function(buffer, name) {
        if (name === shape.indexBuffer) return;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer);
        gl.vertexAttribPointer(
            program.attributes[name],
            buffer.itemSize,
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(program.attributes[name]);
    });

    if (shape.indexBuffer) {
        gl.bindBuffer(
            gl.ELEMENT_ARRAY_BUFFER,
            shape.buffers[shape.indexBuffer].buffer
        );
        gl.drawElements(
            shape.drawMode,
            shape.numVertices,
            gl.UNSIGNED_SHORT,
            0
        );
    } else {
        gl.drawArrays(shape.drawMode, 0, shape.numVertices);
    }

    if (shape.alpha) {
        gl.disable(gl.BLEND);
    }
};

var animate = function(minTimeDelta, numSamples, func) {
    var stop = true;
    var samples = 0,
        sampleTimeDelta = 0,
        fps = 0;
    var speed = 0;
    var time = 0;
    var requestFrame = function(prev, now) {
        if (now - prev >= minTimeDelta) {
            time += (now - prev) * speed;
            sampleTimeDelta += now - prev;
            if (++samples >= numSamples) {
                fps = (numSamples * 1e3) / sampleTimeDelta;
                samples = 0;
                sampleTimeDelta = 0;
            }
            func(prev, time, fps);
            prev = now;
        }
        if (stop) {
            samples = 0;
            sampleTimeDelta = 0;
            fps = 0;
        } else
            window.requestAnimationFrame(function(next) {
                requestFrame(prev, next);
            });
    };
    return {
        stop: function() {
            stop = true;
            speed = 0;
        },
        start: function() {
            window.requestAnimationFrame(function(time) {
                stop = false;
                speed = 1;
                requestFrame(time, time);
            });
            return this;
        },
        setSpeed: function(s) {
            speed = s;
        },
        getSpeed: function() {
            return speed;
        }
    };
};
