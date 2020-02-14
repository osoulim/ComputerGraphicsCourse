"use strict";

var buildSphere = function(gl, program, latitudeBands, longitudeBands) {
    var position = [],
        index = [],
        texture = [];

    //calculate vertex positions
    for (var lat = 0; lat <= latitudeBands; lat++) {
        var theta = (lat * PI) / latitudeBands,
            sin_theta = sin(theta),
            cos_theta = cos(theta);

        for (var long = 0; long <= longitudeBands; long++) {
            var psi = (long * 2 * PI) / longitudeBands;
            position.push(cos(psi) * sin_theta, cos_theta, sin(psi) * sin_theta);
        }
    }

    //create texture coordinate buffer
    for (var lat = 0; lat <= latitudeBands; lat++) {
        for (var long = 0; long <= longitudeBands; long++) {
            texture.push(long / longitudeBands, lat / latitudeBands);
        }
    }

    //create index buffer
    for (var lat = 0; lat < latitudeBands; lat++) {
        for (var long = 0; long <= longitudeBands; long++)
            index.push(
                (lat + 1) * longitudeBands + long,
                lat * longitudeBands + long
            );
    }

    return {
        numVertices: index.length,
        buffers: {
            vertexPosition: createBuffer(gl, {
                data: new Float32Array(position),
                target: gl.ARRAY_BUFFER,
                itemSize: 3
            }),
            vertexNormal: createBuffer(gl, {
                data: new Float32Array(position), //position and normal vectors are identical for a unit sphere
                target: gl.ARRAY_BUFFER,
                itemSize: 3
            }),
            vertexTexture: createBuffer(gl, {
                data: new Float32Array(texture),
                target: gl.ARRAY_BUFFER,
                itemSize: 2
            }),
            index: createBuffer(gl, {
                data: new Uint16Array(index),
                target: gl.ELEMENT_ARRAY_BUFFER,
                itemSize: 3
            })
        },
        indexBuffer: "index",
        program: program,
        uniforms: { Model: { data: mat4.create(), type: gl.uniformMatrix4fv } },
        drawMode: gl.TRIANGLE_STRIP
    };
};

var buildCircle = function(gl, program, segments) {
    console.info("Building shape: circle\n\t" + segments + " segments");

    var sigma = (2 * PI) / segments;
    var positions = list(0, segments - 1).map(function(segment) {
        var theta = sigma * segment;
        return [sin(theta), 0, cos(theta)];
    });

    console.info("\t" + positions.length + " position coordinates");

    return {
        numVertices: segments,
        buffers: {
            vertexPosition: createBuffer(gl, {
                data: new Float32Array(flattenArray(positions)),
                target: gl.ARRAY_BUFFER,
                itemSize: 3
            })
        },
        program: program,
        uniforms: { Model: { data: mat4.create(), type: gl.uniformMatrix4fv } },
        drawMode: gl.LINE_LOOP
    };
};

//draw /shape/ to webgl context /gl/

function addMouseDragListener(elem, callback) {
    function scale(point) {
        const rect = elem.getBoundingClientRect();
        const elemSize = [rect.right - rect.left, rect.bottom - rect.top];
        const halfElemSize = [elemSize[0] / 2, elemSize[1] / 2];
        const elemCenter = [
            rect.left + halfElemSize[0],
            rect.top + halfElemSize[1]
        ];
        return {
            x: (point.x - elemCenter[0]) / halfElemSize[0],
            y: -(point.y - elemCenter[1]) / halfElemSize[0]
        };
    }

    let point = undefined;

    elem.addEventListener("mousedown", evt => {
        point = scale({ x: evt.clientX, y: evt.clientY });
    });
    elem.addEventListener("mousemove", evt => {
        if (point === undefined) return;

        const p = scale({ x: evt.clientX, y: evt.clientY });
        callback(p, point);

        point = p;
    });
    elem.addEventListener("mouseup", evt => {
        if (point === undefined) return;

        const p = scale({ x: evt.clientX, y: evt.clientY });
        callback(p, point);

        point = undefined;
    });
}

function addMouseScrollListener(elem, callback) {
    elem.addEventListener(
        "mousewheel",
        evt => {
            callback(evt.wheelDelta);
            return false;
        },
        false
    );
}

var main = function(shaderSources, textures) {
    // main()
    var canvas = document.getElementById("canvas");
    var gl = initGL(canvas);

    let cameraRotation = quat.create();
    addMouseDragListener(canvas, (point, lastPoint) => {
        const u = arcballVector(point);
        const v = arcballVector(lastPoint);
        quat.mul(
            cameraRotation,
            quat.rotationTo(quat.create(), v, u),
            cameraRotation
        );
    });
    let cameraZoom = 1;
    addMouseScrollListener(canvas, wheelDelta => {
        const zoomFactor = -wheelDelta / 300;
        cameraZoom = Math.max(1, Math.min(10, cameraZoom + zoomFactor));
    });

    let viewDirection = "in";
    let rotationLock = "orbit";
    textures = loadTextures(gl, textures);

    var programs = createPrograms(
        gl,
        {
            planet: {
                vertex: "planetVert",
                fragment: "planetFrag",
                attributes: ["vertexPosition", "vertexNormal", "vertexTexture"],
                uniforms: ["Model", "View", "Projection", "textureSampler", "lightPosition", "lightLuminosity"]
            },
            skybox: {
                vertex: "skyboxVert",
                fragment: "skyboxFrag",
                attributes: ["vertexPosition", "vertexNormal", "vertexTexture"],
                uniforms: ["Model", "View", "Projection", "textureSampler"]
            },
            star: {
                vertex: "starVert",
                fragment: "starFrag",
                attributes: ["vertexPosition", "vertexNormal", "vertexTexture"],
                uniforms: ["Model", "View", "Projection", "textureSampler"]
            },
            simple: {
                vertex: "simpleVert",
                fragment: "simpleFrag",
                attributes: ["vertexPosition"],
                uniforms: ["Model", "View", "Projection", "Color"]
            }
        },
        shaderSources
    );

    var uniforms = {
        View: { data: mat4.create(), type: gl.uniformMatrix4fv },
        Projection: { data: mat4.create(), type: gl.uniformMatrix4fv },
        Color: { data: vec4.create(0.2, 0.2, 1.0, 1.0), type: gl.uniform4fv }
    };

    var shapes = {
        planet: buildSphere(gl, programs.planet, 48, 96),
        star: buildSphere(gl, programs.star, 48, 96),
        orbit: buildCircle(gl, programs.simple, 1024),
        skybox: buildSphere(gl, programs.skybox, 48, 96)
	};
	
    shapes.skybox.textures = { textureSampler: textures.stars };
    shapes.skybox.uniforms = {
        Model: { data: mat4.create(), type: gl.uniformMatrix4fv },
        Projection: {
            data: mat4.perspective(mat4.create(), PI / 2, 1024 / 768, 0.2, 2),
            type: gl.uniformMatrix4fv
        }
	};
	
    var lights = {};

    var scaleDistance = function(d) {
        return Math.cbrt(d);
    };
    var scaleSpeed = function(s) {
        return s === 0 ? 0 : 1 / (Math.cbrt(s) * 1000);
    };

    var sun = {
        name: "Sun",
        luminosity: 3846e23,
        radius: 1392684,
        rotationPeriod: 24.47 * 24,
        orbitalPeriod: 0,
        texture: textures.sun,
        surface: "textures/sun.jpg",
        satellites: [
            {
                name: "Mercury",
                radius: 4878 / 2,
                orbitalDistance: 579e5,
                orbitalPeriod: 0.24 * 365,
                rotationPeriod: 58.65,
                texture: textures.mercury,
                surface: "textures/mercury.jpg"
            },
            {
                name: "Venus",
                radius: 12104 / 2,
                orbitalDistance: 1082e5,
                rotationPeriod: -243,
                orbitalPeriod: 0.62 * 365,
                tilt: 2.64,
                texture: textures.venus,
                surface: "textures/venus.jpg"
            },
            {
                name: "Earth",
                radius: 12756 / 2,
                orbitalDistance: 1496e5,
                orbitalPeriod: 1 * 365,
                rotationPeriod: 1,
                texture: textures.earth,
                tile: 23.44,
                surface: "textures/earth.jpg"
            },
            {
                name: "Mars",
                orbitalDistance: 2279e5,
                radius: 6787 / 2,
                rotationPeriod: 1.03,
                orbitalPeriod: 1.88 * 365,
                tilt: 25.19,
                texture: textures.mars,
                surface: "textures/mars.jpg"
            },
            {
                name: "Jupiter",
                radius: 1427960 / 2,
                orbitalPeriod: 11.86 * 365,
                orbitalDistance: 7783e5,
                rotationPeriod: 0.41,
                tilt: 3.13,
                texture: textures.jupiter,
                surface: "textures/jupiter.jpg"
            },
            {
                name: "Saturn",
                radius: 120660 / 2,
                orbitalDistance: 1427e6,
                orbitalPeriod: 29.46 * 365,
                rotationPeriod: 0.44,
                texture: textures.saturn,
                tilt: 26.73,
                surface: "textures/saturn.jpg"
            },
            {
                name: "Uranus",
                radius: 51118 / 2,
                orbitalDistance: 2871e6,
                orbitalPeriod: 84.01 * 365,
                rotationPeriod: -0.72,
                tilt: 97.77,
                texture: textures.uranus,
                surface: "textures/uranus.jpg"
            },
            {
                name: "Neptune",
                radius: 48600 / 2,
                orbitalDistance: 44971e5,
                orbitalPeriod: 164.8 * 365,
                rotationPeriod: 0.72,
                tilt: 28.32,
                texture: textures.neptune,
                surface: "textures/neptune.jpg"
            }
        ]
    };

    var selected = sun


    var draw = function(prev, now, fps) {
        const canvasBoundingRect = canvas.getBoundingClientRect();
        const aspectRatio =
            canvasBoundingRect.width / canvasBoundingRect.height;

        var updatePlanets = function(planet, parentTransform) {
            parentTransform = parentTransform || {
                position: mat4.create(),
                orbitRotation: mat4.create()
            };

            planet.transform = {
                position: mat4.clone(parentTransform.position),
                surface: mat4.create(),
                orbit: mat4.create(),
                orbitRotation: mat4.clone(parentTransform.orbitRotation),
                surfaceRotation: mat4.create()
            };

            if (planet.orbitalPeriod) {
                mat4.rotateY(
                    planet.transform.orbitRotation,
                    planet.transform.orbitRotation,
                    now * scaleSpeed(planet.orbitalPeriod)
                );
            }
            if (planet.orbitalDistance) {
                var orbitalDistance = scaleDistance(planet.orbitalDistance);
                mat4.multiply(
                    planet.transform.position,
                    planet.transform.position,
                    mat4.translate(
                        mat4.create(),
                        planet.transform.orbitRotation,
                        [0, 0, orbitalDistance]
                    )
                );

                mat4.scale(planet.transform.orbit, planet.transform.orbit, [
                    orbitalDistance,
                    orbitalDistance,
                    orbitalDistance
                ]);
                mat4.multiply(
                    planet.transform.orbit,
                    parentTransform.position,
                    planet.transform.orbit
                );
            }
            if (planet.rotationPeriod) {
                mat4.rotateY(
                    planet.transform.surfaceRotation,
                    planet.transform.surfaceRotation,
                    now * scaleSpeed(planet.rotationPeriod)
                );
            }
            if (planet.radius) {
                var radius = scaleDistance(planet.radius);
                mat4.scale(
                    planet.transform.surface,
                    planet.transform.surfaceRotation,
                    [radius, radius, radius]
                );
                mat4.multiply(
                    planet.transform.surface,
                    planet.transform.position,
                    planet.transform.surface
                );
            }

            if (planet.satellites)
                planet.satellites.forEach(function(satellite) {
                    updatePlanets(satellite, planet.transform);
                });
        };

        var systemRadius = function(planet) {
            var r = planet.radius;
            if (planet.satellites)
                planet.satellites.forEach(function(satellite) {
                    if (satellite.orbitalDistance > r)
                        r = satellite.orbitalDistance;
                });
            return r;
        };

        var setUniforms = function(planet) {
            if (planet === selected) {
                var planetPosition = vec3.transformMat4(
                    vec3.create(),
                    [0, 0, 0],
                    planet.transform.position
                );
                var r = systemRadius(planet) * 0.4 + planet.radius * 0.6;
                const rotation = mat4.fromQuat(mat4.create(), cameraRotation);
                const translation = mat4.fromTranslation(
                    mat4.create(),
                    vec3.sub(vec3.create(), vec3.create(), planetPosition)
                );
                const offset = mat4.fromTranslation(mat4.create(), [
                    0,
                    0,
                    -scaleDistance((r * 10) ^ (1 / 2)) * cameraZoom
                ]);

                const eyePos = mat4.create();
                if (viewDirection === "out") mat4.rotateY(eyePos, eyePos, PI);
                mat4.mul(eyePos, eyePos, offset);
                mat4.mul(eyePos, eyePos, rotation);
                if (rotationLock === "surface")
                    mat4.mul(
                        eyePos,
                        eyePos,
                        mat4.invert(
                            mat4.create(),
                            planet.transform.surfaceRotation
                        )
                    );
                if (rotationLock === "surface" || rotationLock === "orbit")
                    mat4.mul(
                        eyePos,
                        eyePos,
                        mat4.invert(
                            mat4.create(),
                            mat4.fromQuat(
                                mat4.create(),
                                mat4.getRotation(
                                    quat.create(),
                                    planet.transform.position
                                )
                            )
                        )
                    );
                mat4.mul(eyePos, eyePos, translation);

                uniforms.View.data = eyePos;
                mat4.perspective(
                    uniforms.Projection.data,
                    PI / 2,
                    aspectRatio,
                    scaleDistance(r * 1e-3),
                    scaleDistance(r * 1e8)
                ); // out, fovy, aspect, near, far
                return true;
            }

            if (planet.satellites)
                if (
                    planet.satellites.some(function(satellite) {
                        return setUniforms(satellite);
                    })
                )
                    return true;

            return false;
        };

        var setLights = function(planet) {
            var lightPosition = [],
                lightLuminosity = [];

            var getLights = function(planet) {
                if (planet.luminosity && planet.position) {
                    lightPosition.push(
                        planet.position[0],
                        planet.position[1],
                        planet.position[2]
                    );
                    lightLuminosity.push(planet.luminosity);
                }

                if (planet.satellites) planet.satellites.forEach(getLights);
            };
            getLights(planet);

            uniforms.lightPosition = {
                type: gl.uniform3fv,
                data: new Float32Array(lightPosition)
            };
            uniforms.lightLuminosity = {
                type: gl.uniform1fv,
                data: new Float32Array(lightLuminosity)
            };
        };

        var drawPlanet = function(planet) {
            //draw the planets orbit
            shapes.orbit.uniforms.Model = {
                data: planet.transform.orbit,
                type: gl.uniformMatrix4fv
            };
            shapes.orbit.uniforms.Color = {
                data: vec4.create(1.0, 0.0, 0.0, 1.0),
                type: gl.uniform4fv
            };
            drawShape(gl, shapes.orbit, uniforms);

            //draw the planets surface
            var shape = planet.luminosity ? shapes.star : shapes.planet;
            shape.textures = { textureSampler: planet.texture };
            shape.uniforms.Model.data = planet.transform.surface;
            drawShape(gl, shape, uniforms);

            //draw its satellites
            if (planet.satellites)
                planet.satellites.forEach(function(satellite) {
                    drawPlanet(satellite);
                });
        };

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //draw skybox
        drawShape(gl, shapes.skybox, {
            View: {
                data: mat4.fromQuat(
                    mat4.create(),
                    mat4.getRotation(quat.create(), uniforms.View.data)
                ),
                type: gl.uniformMatrix4fv
            }
        });

        gl.clear(gl.DEPTH_BUFFER_BIT);
        updatePlanets(sun);
        if (!setUniforms(sun)) {
            mat4.lookAt(
                uniforms.View.data,
                [0, scaleDistance(1e9), scaleDistance(8e9)],
                [0, -scaleDistance(5e8), 0],
                [0, 1e3, -1e3]
            ); // out, eye, scale, up
            mat4.perspective(
                uniforms.Projection.data,
                PI / 2,
                aspectRatio,
                scaleDistance(1e8),
                scaleDistance(1e32)
            ); // out, fovy, aspect, near, far
        }
        setLights(sun);
        drawPlanet(sun);
    };

    var animation = animate(1e3 / 120, 60, draw).start();
};


loadFiles(
    {
        planetVert: "shaders/planet.vert",
        planetFrag: "shaders/planet.frag",
        starVert: "shaders/star.vert",
        starFrag: "shaders/star.frag",
        skyboxVert: "shaders/skybox.vert",
        skyboxFrag: "shaders/skybox.frag",
        simpleVert: "shaders/simple.vert",
        simpleFrag: "shaders/simple.frag"
    },
    function(shaderSources) {
        loadImages(
            {
                earth: "textures/earth.jpg",
                sun: "textures/sun.jpg",
                jupiter: "textures/jupiter.jpg",
                mars: "textures/mars.jpg",
                neptune: "textures/neptune.jpg",
                saturn: "textures/saturn.jpg",
                venus: "textures/venus.jpg",
                stars: "textures/stars.jpg",
                uranus: "textures/uranus.jpg",
                mercury: "textures/mercury.jpg"
            },
            function(textures) {
                main(shaderSources, textures);
            }
        );
    }
);
