precision highp float;

uniform float u_time;
uniform float u_cosmic_seed;
uniform float u_flux_delta;
uniform vec2 u_resolution;
uniform vec2 u_offset;
uniform float u_station_hue;

varying vec2 vUv;

float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float whiteNoise(vec2 p) {
    return hash(p + u_time * 0.001);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 6; i++) {
        value += amplitude * valueNoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

vec2 curlNoise(vec2 p) {
    float eps = 0.01;
    float n1 = fbm(p + vec2(eps, 0.0));
    float n2 = fbm(p - vec2(eps, 0.0));
    float n3 = fbm(p + vec2(0.0, eps));
    float n4 = fbm(p - vec2(0.0, eps));
    return vec2((n3 - n4), -(n1 - n2)) / (2.0 * eps);
}

vec3 coldPalette(float t) {
    vec3 a = vec3(0.02, 0.02, 0.06);
    vec3 b = vec3(0.15, 0.18, 0.35);
    vec3 c = vec3(0.3, 0.4, 0.8);
    vec3 d = vec3(0.6, 0.65, 0.9);
    return mix(mix(a, b, smoothstep(0.0, 0.33, t)),
               mix(c, d, smoothstep(0.33, 1.0, t)),
               smoothstep(0.33, 0.66, t));
}

vec3 warmPalette(float t) {
    vec3 a = vec3(0.05, 0.02, 0.02);
    vec3 b = vec3(0.35, 0.12, 0.08);
    vec3 c = vec3(0.8, 0.35, 0.15);
    vec3 d = vec3(0.95, 0.75, 0.4);
    return mix(mix(a, b, smoothstep(0.0, 0.33, t)),
               mix(c, d, smoothstep(0.33, 1.0, t)),
               smoothstep(0.33, 0.66, t));
}

vec3 vividPalette(float t) {
    vec3 a = vec3(0.05, 0.08, 0.15);
    vec3 b = vec3(0.1, 0.45, 0.55);
    vec3 c = vec3(0.6, 0.2, 0.7);
    vec3 d = vec3(0.2, 0.8, 0.65);
    return mix(mix(a, b, smoothstep(0.0, 0.33, t)),
               mix(c, d, smoothstep(0.33, 1.0, t)),
               smoothstep(0.33, 0.66, t));
}

vec3 hueShift(vec3 color, float shift) {
    float angle = shift * 6.28318;
    float s = sin(angle);
    float c = cos(angle);
    vec3 k = vec3(0.57735);
    return color * c + cross(k, color) * s + k * dot(k, color) * (1.0 - c);
}

void main() {
    vec2 uv = vUv;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0) + u_offset;

    float flux = clamp(u_cosmic_seed, 0.0, 1.0);
    float absDelta = abs(u_flux_delta);
    float speed = 0.15 + absDelta * 2.0;
    float t = u_time * speed;

    vec2 curl = curlNoise(p * 2.0 + t * 0.1);
    vec2 flowUv = p + curl * 0.3 * flux;
    float fluid = fbm(flowUv * 3.0 + t * 0.05);

    float grain = whiteNoise(uv * u_resolution * 0.5);
    float staticPattern = mix(grain, valueNoise(p * 20.0 + t * 0.5), 0.5);

    float blended = mix(staticPattern, fluid, flux);

    float localShift = fbm(flowUv * 1.5 + t * 0.02) * 0.4 - 0.2;

    vec3 color;
    float shiftedBlend = clamp(blended + localShift, 0.0, 1.0);

    vec3 coldColor = coldPalette(shiftedBlend);
    vec3 vividColor = vividPalette(shiftedBlend);
    vec3 warmColor = warmPalette(shiftedBlend);

    float vividStrength = smoothstep(0.2, 0.45, flux) * smoothstep(0.8, 0.55, flux);

    if (flux < 0.5) {
        vec3 base = mix(coldColor, warmColor, flux * 2.0);
        color = mix(base, vividColor, vividStrength);
    } else {
        vec3 base = mix(coldColor, warmColor, flux);
        color = mix(base, vividColor, vividStrength * 0.7);
    }

    float satBoost = 1.0 + smoothstep(0.02, 0.15, absDelta) * 0.6;
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luma), color, satBoost);

    // vignette uses screen-space, not offset, so it stays centered
    vec2 screenP = (uv - 0.5) * vec2(aspect, 1.0);
    float vignette = 1.0 - smoothstep(0.4, 1.4, length(screenP));
    color *= vignette;

    color = hueShift(color, u_station_hue);

    color += (grain - 0.5) * 0.03;

    float pulse = 1.0 + smoothstep(0.0, 0.1, absDelta) * 0.15;
    color *= pulse;

    gl_FragColor = vec4(color, 1.0);
}
