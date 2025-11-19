/**
 * scripts/generate-sample-videos.ts
 * Gerador de vídeos sintéticos mínimos para testes do detector de loops.
 * Requisitos: ffmpeg/ffprobe no PATH e Bun runtime.
 *
 * Cria pasta `sample-videos/` na raiz com arquivos:
 *  - loop_solid_red.mp4          (self-loop perfeito: frame inicial == final)
 *  - loop_rotating_square.mp4    (quadrado rotaciona 360° → volta ao estado inicial)
 *  - nonloop_transition.mp4      (fade preto → branco, último diferente do primeiro)
 *  - pair_A_end_green.mp4        (termina em verde)
 *  - pair_B_start_green.mp4      (começa em verde) → combinação A→B deve ser match alto
 *  - diff_resolution_A.mp4       (640x360 azul) e diff_resolution_B.mp4 (800x600 azul) → early skip
 *  - loop_gradient.mp4           (gradiente horizontal animado que retorna ao início)
 *
 * Cada vídeo é curto (2–3s) e baixa resolução para acelerar geração e comparação.
 */

import { mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { $ } from 'bun'

interface SampleVideoSpec {
  file: string
  description: string
  ffmpegArgs: string[] // args após 'ffmpeg'
}

const OUT_DIR = join(process.cwd(), 'sample-videos')

async function ensureOutDir() {
  try { await mkdir(OUT_DIR, { recursive: true }) } catch {}
}

// ==== Especificações individuais (cada vídeo em função separada) ====
function makeLoopSolidRed(): SampleVideoSpec {
  return {
    file: 'loop_solid_red.mp4',
    description: 'Frame estático vermelho (self-loop perfeito).',
    ffmpegArgs: ['-y','-f','lavfi','-i','color=c=red:s=320x240:d=2','-pix_fmt','yuv420p',join(OUT_DIR,'loop_solid_red.mp4')]
  }
}

function makeLoopRotatingSquare(): SampleVideoSpec {
  return {
    file: 'loop_rotating_square.mp4',
    description: 'Quadrado branco rotacionando 360° (início == fim).',
    ffmpegArgs: [
      '-y','-f','lavfi','-i','color=c=black:s=320x240:d=2','-f','lavfi','-i','color=c=white:s=80x80:d=2',
      '-filter_complex','[1:v]format=rgba,rotate=2*PI*t/2:ow=rotw(iw):oh=roth(ih)[sq];[0:v][sq]overlay=(W-w)/2:(H-h)/2',
      '-pix_fmt','yuv420p',join(OUT_DIR,'loop_rotating_square.mp4')
    ]
  }
}

function makeNonLoopTransition(): SampleVideoSpec {
  return {
    file: 'nonloop_transition.mp4',
    description: 'Fade de preto para branco (não é loop).',
    ffmpegArgs: ['-y','-f','lavfi','-i','color=c=black:s=320x240:d=2','-f','lavfi','-i','color=c=white:s=320x240:d=2','-filter_complex','xfade=transition=fade:duration=2:offset=0','-pix_fmt','yuv420p',join(OUT_DIR,'nonloop_transition.mp4')]
  }
}

function makePairAEndGreen(): SampleVideoSpec {
  return {
    file: 'pair_A_end_green.mp4',
    description: 'Termina em quadro verde sólido (match alto com B).',
    ffmpegArgs: ['-y','-f','lavfi','-i','color=c=blue:s=320x240:d=1.2','-f','lavfi','-i','color=c=green:s=320x240:d=1.2','-filter_complex','concat=n=2:v=1:a=0','-pix_fmt','yuv420p',join(OUT_DIR,'pair_A_end_green.mp4')]
  }
}

function makePairBStartGreen(): SampleVideoSpec {
  return {
    file: 'pair_B_start_green.mp4',
    description: 'Começa em quadro verde sólido (match alto com A).',
    ffmpegArgs: ['-y','-f','lavfi','-i','color=c=green:s=320x240:d=1.2','-f','lavfi','-i','color=c=purple:s=320x240:d=1.2','-filter_complex','concat=n=2:v=1:a=0','-pix_fmt','yuv420p',join(OUT_DIR,'pair_B_start_green.mp4')]
  }
}

function makeDiffResolutionA(): SampleVideoSpec {
  return {
    file: 'diff_resolution_A.mp4',
    description: 'Azul 640x360 (early skip contra B).',
    ffmpegArgs: ['-y','-f','lavfi','-i','color=c=blue:s=640x360:d=2','-pix_fmt','yuv420p',join(OUT_DIR,'diff_resolution_A.mp4')]
  }
}

function makeDiffResolutionB(): SampleVideoSpec {
  return {
    file: 'diff_resolution_B.mp4',
    description: 'Azul 800x600 (resolução diferente de A).',
    ffmpegArgs: ['-y','-f','lavfi','-i','color=c=blue:s=800x600:d=2','-pix_fmt','yuv420p',join(OUT_DIR,'diff_resolution_B.mp4')]
  }
}

function makeLoopGradient(): SampleVideoSpec {
  return {
    file: 'loop_gradient.mp4',
    description: 'Barra vermelha rolando horizontalmente (loop simples, sem geq).',
    // Usa overlay para mover uma barra vermelha ao longo do eixo X e reiniciar (mod) → loop.
    ffmpegArgs: [
      '-y',
      '-f','lavfi','-i','color=c=black:s=320x240:d=2',
      '-f','lavfi','-i','color=c=red:s=80x240:d=2',
      '-filter_complex','[1:v]format=rgba[bar];[0:v][bar]overlay=x=mod(t*160\\,W-w):y=(H-h)/2',
      '-pix_fmt','yuv420p',
      join(OUT_DIR,'loop_gradient.mp4')
    ]
  }
}

// ===== NOVOS VÍDEOS (mais longos e complexos) =====
function makeColorCycle10s(): SampleVideoSpec {
  return {
    file: 'loop_color_cycle_10s.mp4',
    description: 'Ciclo de cores (vermelho→verde→azul→vermelho) em 10s (loop).',
    ffmpegArgs: [
      '-y','-f','lavfi','-i','color=c=red:s=320x240:d=10','-f','lavfi','-i','color=c=green:s=320x240:d=10','-f','lavfi','-i','color=c=blue:s=320x240:d=10',
      '-filter_complex','[0:v][1:v][2:v]concat=n=3:v=1:a=0,loop=loop=-1:size=1',
      '-t','10','-pix_fmt','yuv420p',join(OUT_DIR,'loop_color_cycle_10s.mp4')
    ]
  }
}

function makeMovingRectangle20s(): SampleVideoSpec {
  return {
    file: 'moving_rectangle_horizontal_20s.mp4',
    description: 'Retângulo branco move-se horizontalmente e retorna (loop).',
    ffmpegArgs: [
      '-y','-f','lavfi','-i','color=c=black:s=320x240:d=20','-f','lavfi','-i','color=c=white:s=60x60:d=20',
      '-filter_complex','[1:v]format=rgba[shape];[0:v][shape]overlay=x=mod(t*80\\,W-w):y=(H-h)/2',
      '-pix_fmt','yuv420p',join(OUT_DIR,'moving_rectangle_horizontal_20s.mp4')
    ]
  }
}

function makeBouncingCircle10s(): SampleVideoSpec {
  return {
    file: 'bouncing_square_10s.mp4',
    description: 'Quadrado verde simulando bounce vertical (sem geq, compatível Windows).',
    // Implementação: fundo preto + quadrado verde (80x80) com movimento sinusoidal vertical.
    // Uso de overlay com expressão em y; mod de seno garante frame inicial==final (loop).
    ffmpegArgs: [
      '-y',
      '-f','lavfi','-i','color=c=black:s=320x240:d=10',
      '-f','lavfi','-i','color=c=green:s=80x80:d=10',
      '-filter_complex','[1:v]format=rgba[sq];[0:v][sq]overlay=x=(W-w)/2:y=(H-h)/2+40*sin(2*PI*t/5)',
      '-pix_fmt','yuv420p',
      join(OUT_DIR,'bouncing_square_10s.mp4')
    ]
  }
}

function makeTriangleSpinFade20s(): SampleVideoSpec {
  return {
    file: 'triangle_spin_fade_20s.mp4',
    description: 'Quadrado rotacionando com fade in/out (substitui triângulo geq).',
    // Evita geq: usa um quadrado branco rotacionando com fade no início e no fim.
    ffmpegArgs: [
      '-y',
      '-f','lavfi','-i','color=c=black:s=320x240:d=20',
      '-f','lavfi','-i','color=c=white:s=90x90:d=20',
      '-filter_complex','[1:v]format=rgba,rotate=2*PI*t/20:ow=rotw(iw):oh=roth(ih),fade=t=in:st=0:d=2,fade=t=out:st=18:d=2[sq];[0:v][sq]overlay=(W-w)/2:(H-h)/2',
      '-pix_fmt','yuv420p',
      join(OUT_DIR,'triangle_spin_fade_20s.mp4')
    ]
  }
}

function makeOverlappingShapesTransition10s(): SampleVideoSpec {
  return {
    file: 'overlapping_shapes_transition_10s.mp4',
    description: 'Do retângulo azul para retângulo amarelo com crossfade.',
    ffmpegArgs: [
      '-y','-f','lavfi','-i','color=c=blue:s=320x240:d=10','-f','lavfi','-i','color=c=yellow:s=320x240:d=10',
      '-filter_complex','xfade=transition=fadeblack:duration=2:offset=4',
      '-pix_fmt','yuv420p',join(OUT_DIR,'overlapping_shapes_transition_10s.mp4')
    ]
  }
}

function makeGradientPulse10s(): SampleVideoSpec {
  return {
    file: 'gradient_pulse_10s.mp4',
    description: 'Vermelho pulsando com fades (início=fim para loop).',
    // Implementação alternativa sem geq (falhas de parsing no Windows).
    // 4 segmentos de 2.5s: fade in, fade out, fade in, fade out → 10s total.
    ffmpegArgs: [
      '-y',
      '-f','lavfi','-i','color=c=red:s=320x240:d=2.5',
      '-f','lavfi','-i','color=c=red:s=320x240:d=2.5',
      '-f','lavfi','-i','color=c=red:s=320x240:d=2.5',
      '-f','lavfi','-i','color=c=red:s=320x240:d=2.5',
      '-filter_complex',
      '[0:v]fade=t=in:st=0:d=2.5,format=yuv420p[s0];' +
      '[1:v]fade=t=out:st=0:d=2.5,format=yuv420p[s1];' +
      '[2:v]fade=t=in:st=0:d=2.5,format=yuv420p[s2];' +
      '[3:v]fade=t=out:st=0:d=2.5,format=yuv420p[s3];' +
      '[s0][s1][s2][s3]concat=n=4:v=1:a=0[v]',
      '-map','[v]',
      '-pix_fmt','yuv420p',
      join(OUT_DIR,'gradient_pulse_10s.mp4')
    ]
  }
}

// ===== Novos vídeos complexos de 10s com múltiplas formas e transformações =====
// Evitam iniciar/terminar com tela sólida e usam fundo animado ou composto.

function makeMultiMorphShapesA10s(): SampleVideoSpec {
  // Estratégia segmentada: 5 segmentos de 2s com disposições diferentes das mesmas 6 formas, xfade entre eles.
  return {
    file: 'multi_morph_shapes_A_10s.mp4',
    description: '6 formas em arranjos diferentes (segmentos + xfade) sem quadro sólido inicial/final.',
    ffmpegArgs: [
      '-y',
      // Geramos 5 fundos não sólidos usando testsrc + drawgrid aproximado via testsrc
      '-f','lavfi','-i','testsrc=size=320x240:rate=25:d=2',
      '-f','lavfi','-i','testsrc=size=320x240:rate=25:d=2',
      '-f','lavfi','-i','testsrc=size=320x240:rate=25:d=2',
      '-f','lavfi','-i','testsrc=size=320x240:rate=25:d=2',
      '-f','lavfi','-i','testsrc=size=320x240:rate=25:d=2',
      // 6 formas coloridas (usadas como overlays fixos em posições diferentes por segmento)
      '-f','lavfi','-i','color=c=0xFF7F50:s=40x40:d=10',
      '-f','lavfi','-i','color=c=0x008080:s=40x40:d=10',
      '-f','lavfi','-i','color=c=0xFF00FF:s=40x40:d=10',
      '-f','lavfi','-i','color=c=0x556B2F:s=40x40:d=10',
      '-f','lavfi','-i','color=c=0xDAA520:s=40x40:d=10',
      '-f','lavfi','-i','color=c=0x00BFFF:s=40x40:d=10',
      '-filter_complex',
      // Segmento 1 overlays
      '[0:v][6:v]overlay=x=20:y=20[s1a];[s1a][7:v]overlay=x=260:y=20[s1b];[s1b][8:v]overlay=x=20:y=180[s1c];[s1c][9:v]overlay=x=260:y=180[s1d];[s1d][10:v]overlay=x=130:y=20[s1e];[s1e][11:v]overlay=x=130:y=180[s1];' +
      // Segmento 2
      '[1:v][6:v]overlay=x=60:y=40[s2a];[s2a][7:v]overlay=x=200:y=40[s2b];[s2b][8:v]overlay=x=60:y=140[s2c];[s2c][9:v]overlay=x=200:y=140[s2d];[s2d][10:v]overlay=x=140:y=90[s2e];[s2e][11:v]overlay=x=140:y=190[s2];' +
      // Segmento 3
      '[2:v][6:v]overlay=x=10:y=30[s3a];[s3a][7:v]overlay=x=270:y=30[s3b];[s3b][8:v]overlay=x=10:y=150[s3c];[s3c][9:v]overlay=x=270:y=150[s3d];[s3d][10:v]overlay=x=160:y=30[s3e];[s3e][11:v]overlay=x=160:y=150[s3];' +
      // Segmento 4
      '[3:v][6:v]overlay=x=40:y=60[s4a];[s4a][7:v]overlay=x=240:y=60[s4b];[s4b][8:v]overlay=x=40:y=120[s4c];[s4c][9:v]overlay=x=240:y=120[s4d];[s4d][10:v]overlay=x=140:y=40[s4e];[s4e][11:v]overlay=x=140:y=160[s4];' +
      // Segmento 5
      '[4:v][6:v]overlay=x=30:y=40[s5a];[s5a][7:v]overlay=x=250:y=40[s5b];[s5b][8:v]overlay=x=30:y=160[s5c];[s5c][9:v]overlay=x=250:y=160[s5d];[s5d][10:v]overlay=x=150:y=40[s5e];[s5e][11:v]overlay=x=150:y=160[s5];' +
      // Xfades encadeados (sobreposição parcial para evitar cortes bruscos)
      '[s1][s2]xfade=transition=fade:duration=0.6:offset=1.7[xa];' +
      '[xa][s3]xfade=transition=fade:duration=0.6:offset=3.4[xb];' +
      '[xb][s4]xfade=transition=fade:duration=0.6:offset=5.1[xc];' +
      '[xc][s5]xfade=transition=fade:duration=0.6:offset=6.8[out]',
      '-map','[out]',
      '-t','10',
      '-pix_fmt','yuv420p',
      join(OUT_DIR,'multi_morph_shapes_A_10s.mp4')
    ]
  }
}

function makeMultiMorphShapesB10s(): SampleVideoSpec {
  // Segment approach over smptebars: 4 segmentos com 5 formas, crossfades.
  return {
    file: 'multi_morph_shapes_B_10s.mp4',
    description: '5 formas sobre smptebars em 4 arranjos com crossfade.',
    ffmpegArgs: [
      '-y',
      '-f','lavfi','-i','smptebars=size=320x240:rate=25:d=2.5',
      '-f','lavfi','-i','smptebars=size=320x240:rate=25:d=2.5',
      '-f','lavfi','-i','smptebars=size=320x240:rate=25:d=2.5',
      '-f','lavfi','-i','smptebars=size=320x240:rate=25:d=2.5',
      '-f','lavfi','-i','color=c=0x8A2BE2:s=50x50:d=10',
      '-f','lavfi','-i','color=c=0xFF1493:s=50x50:d=10',
      '-f','lavfi','-i','color=c=0x3CB371:s=50x50:d=10',
      '-f','lavfi','-i','color=c=0xFFD700:s=50x50:d=10',
      '-f','lavfi','-i','color=c=0xFF4500:s=50x50:d=10',
      '-filter_complex',
      '[0:v][5:v]overlay=x=30:y=30[sb1];[sb1][6:v]overlay=x=240:y=30[sb2];[sb2][7:v]overlay=x=30:y=160[sb3];[sb3][8:v]overlay=x=240:y=160[sb4];[sb4][9:v]overlay=x=140:y=95[s1];' +
      '[1:v][5:v]overlay=x=60:y=40[sc1];[sc1][6:v]overlay=x=210:y=40[sc2];[sc2][7:v]overlay=x=60:y=140[sc3];[sc3][8:v]overlay=x=210:y=140[sc4];[sc4][9:v]overlay=x=140:y=90[s2];' +
      '[2:v][5:v]overlay=x=50:y=50[sd1];[sd1][6:v]overlay=x=220:y=50[sd2];[sd2][7:v]overlay=x=50:y=130[sd3];[sd3][8:v]overlay=x=220:y=130[sd4];[sd4][9:v]overlay=x=140:y=90[s3];' +
      '[3:v][5:v]overlay=x=40:y=60[se1];[se1][6:v]overlay=x=230:y=60[se2];[se2][7:v]overlay=x=40:y=120[se3];[se3][8:v]overlay=x=230:y=120[se4];[se4][9:v]overlay=x=140:y=90[s4];' +
      '[s1][s2]xfade=transition=fade:duration=0.6:offset=1.9[x1];' +
      '[x1][s3]xfade=transition=fade:duration=0.6:offset=3.8[x2];' +
      '[x2][s4]xfade=transition=fade:duration=0.6:offset=5.7[out]',
      '-map','[out]',
      '-t','10',
      '-pix_fmt','yuv420p',
      join(OUT_DIR,'multi_morph_shapes_B_10s.mp4')
    ]
  }
}

function makeMultiMorphShapesC10s(): SampleVideoSpec {
  // Segment approach com fundo cinza e 4 formas em posições mutantes.
  return {
    file: 'multi_morph_shapes_C_10s.mp4',
    description: '4 formas sobre fundo cinza em 5 disposições com xfade.',
    ffmpegArgs: [
      '-y',
      '-f','lavfi','-i','color=c=0x202020:s=320x240:d=2',
      '-f','lavfi','-i','color=c=0x202020:s=320x240:d=2',
      '-f','lavfi','-i','color=c=0x202020:s=320x240:d=2',
      '-f','lavfi','-i','color=c=0x202020:s=320x240:d=2',
      '-f','lavfi','-i','color=c=0x202020:s=320x240:d=2',
      '-f','lavfi','-i','color=c=0xFF8C00:s=50x50:d=10',
      '-f','lavfi','-i','color=c=0x7FFFD4:s=50x50:d=10',
      '-f','lavfi','-i','color=c=0xADFF2F:s=50x50:d=10',
      '-f','lavfi','-i','color=c=0x9932CC:s=50x50:d=10',
      '-filter_complex',
      '[0:v][5:v]overlay=x=20:y=20[c1a];[c1a][6:v]overlay=x=250:y=20[c1b];[c1b][7:v]overlay=x=20:y=170[c1c];[c1c][8:v]overlay=x=250:y=170[c1];' +
      '[1:v][5:v]overlay=x=40:y=40[c2a];[c2a][6:v]overlay=x=230:y=40[c2b];[c2b][7:v]overlay=x=40:y=150[c2c];[c2c][8:v]overlay=x=230:y=150[c2];' +
      '[2:v][5:v]overlay=x=60:y=60[c3a];[c3a][6:v]overlay=x=210:y=60[c3b];[c3b][7:v]overlay=x=60:y=130[c3c];[c3c][8:v]overlay=x=210:y=130[c3];' +
      '[3:v][5:v]overlay=x=80:y=50[c4a];[c4a][6:v]overlay=x=190:y=50[c4b];[c4b][7:v]overlay=x=80:y=140[c4c];[c4c][8:v]overlay=x=190:y=140[c4];' +
      '[4:v][5:v]overlay=x=100:y=40[c5a];[c5a][6:v]overlay=x=170:y=40[c5b];[c5b][7:v]overlay=x=100:y=130[c5c];[c5c][8:v]overlay=x=170:y=130[c5];' +
      '[c1][c2]xfade=transition=fade:duration=0.5:offset=1.8[xc1];' +
      '[xc1][c3]xfade=transition=fade:duration=0.5:offset=3.6[xc2];' +
      '[xc2][c4]xfade=transition=fade:duration=0.5:offset=5.4[xc3];' +
      '[xc3][c5]xfade=transition=fade:duration=0.5:offset=7.2[out]',
      '-map','[out]',
      '-t','10',
      '-pix_fmt','yuv420p',
      join(OUT_DIR,'multi_morph_shapes_C_10s.mp4')
    ]
  }
}

function specList(): SampleVideoSpec[] {
  return [
    makeLoopSolidRed(),
    makeLoopRotatingSquare(),
    makeNonLoopTransition(),
    makePairAEndGreen(),
    makePairBStartGreen(),
    makeDiffResolutionA(),
    makeDiffResolutionB(),
    makeLoopGradient(),
    makeColorCycle10s(),
    makeMovingRectangle20s(),
    makeBouncingCircle10s(),
    makeTriangleSpinFade20s(),
    makeOverlappingShapesTransition10s(),
    makeGradientPulse10s(),
    makeMultiMorphShapesA10s(),
    makeMultiMorphShapesB10s(),
    makeMultiMorphShapesC10s(),
  ]
}

async function ffmpegExists(): Promise<boolean> {
  try {
    await $`ffmpeg -version`.quiet()
    return true
  } catch {
    return false
  }
}

async function generate() {
  if (!(await ffmpegExists())) {
    console.error('ffmpeg não encontrado no PATH. Instale antes de gerar vídeos de exemplo.')
    process.exit(1)
  }

  await ensureOutDir()

  const specs = specList()
  console.log(`Gerando ${specs.length} vídeos em: ${OUT_DIR}`)
  console.log('Descrição rápida:')
  specs.forEach(s => console.log(`  - ${s.file}: ${s.description}`))

  for (const spec of specs) {
    const outPath = join(OUT_DIR, spec.file)
    let skip = false
    try {
      const st = await stat(outPath)
      if (st.size > 0) skip = true
    } catch {}

    if (skip) {
      console.log(`SKIP ${spec.file} (já existe)`)
      continue
    }

    console.log(`→ ${spec.file}: ${spec.description}`)
    try {
      await $`ffmpeg ${spec.ffmpegArgs}`.quiet()
    } catch (err) {
      console.error(`Falha ao gerar ${spec.file}:`, err)
    }
  }

  console.log('Concluído. Exemplos prontos para teste de loops.')
}

generate()
