/**
 * Phaser 4 batches sprites with several textures and picks each pixel's texture in the fragment
 * shader by testing the interpolated texture index for exact equality (`outTexDatum == float(i)`).
 * Some rasterisers (SwiftShader, and GPUs with loose varying precision) interpolate that constant
 * with a tiny rounding error, so in whole blocks of pixels no texture matches and the sprite turns
 * transparent there. Big figures like the yeti then lose straight-edged chunks, and the parts
 * underneath show through as flat patches. Rounding the index before comparing fixes it.
 *
 * Must run before the game creates its renderer and compiles shaders: `src/ui/app.ts` imports this
 * module first. It changes only shader source that mentions Phaser's `outTexDatum`.
 */
function roundTextureIndexInShaders(): void {
  const fix = (src: string): string =>
    src.includes('outTexDatum')
      ? src
          .replace(/outTexDatum == (0\.0|float\(INDEX\))/g, 'abs(outTexDatum - $1) < 0.5')
          .replace(/float texId = outTexDatum;/g, 'float texId = floor(outTexDatum + 0.5);')
      : src;
  const contexts = [globalThis.WebGLRenderingContext, globalThis.WebGL2RenderingContext];
  for (const ctx of contexts) {
    if (!ctx) continue;
    const proto = ctx.prototype as WebGLRenderingContext & { __fondueTexFix?: boolean };
    if (proto.__fondueTexFix) continue;
    const original = proto.shaderSource;
    proto.shaderSource = function (this: WebGLRenderingContext, shader: WebGLShader, source: string) {
      original.call(this, shader, fix(source));
    };
    proto.__fondueTexFix = true;
  }
}

roundTextureIndexInShaders();
