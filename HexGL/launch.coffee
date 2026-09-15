$ = (_) -> document.getElementById _

# Habillage ACME — point unique de configuration des libelles de l'interface.
# Seuls les libelles changent : les valeurs selectionnables et leur ordre sont
# ceux attendus par le moteur de jeu (controlType, quality, hud, godmode).
# L'item godmode est masque : son libelle reste en anglais.
labels =
  controlType:
    prefix: 'Contrôles : '
    values: ['Clavier', 'Tactile', 'Leap Motion', 'Manette']
    # Le moteur accepte en plus le type 4 (gyroscope), atteignable uniquement
    # par parametre d'URL. Il n'entre pas dans le cycle du menu mais doit
    # afficher un libelle valide plutot que "undefined".
    extra: { 4: 'Gyroscope' }
  quality:
    prefix: 'Qualité : '
    values: ['Basse', 'Moyenne', 'Haute', 'Très haute']
  hud:
    prefix: 'HUD : '
    values: ['Désactivé', 'Activé']
  godmode:
    prefix: 'Godmode : '
    values: ['Off', 'On']

init = (controlType, quality, hud, godmode) ->
  hexGL = new bkcore.hexgl.HexGL(
    document: document
    width: window.innerWidth
    height: window.innerHeight
    container: $ 'main'
    overlay: $ 'overlay'
    gameover: $ 'step-5'
    quality: quality
    difficulty: 0
    hud: hud is 1
    controlType: controlType
    godmode: godmode
    track: 'Cityscape'
  )
  window.hexGL=hexGL

  progressbar = $ 'progressbar'
  hexGL.load(
    onLoad: ->
      console.log 'LOADED.'
      hexGL.init()
      $('step-3').style.display = 'none'
      $('step-4').style.display = 'block'
      hexGL.start()
    onError: (s) ->
      console.error "Error loading #{ s }."
    onProgress: (p, t, n) ->
      console.log("LOADED "+t+" : "+n+" ( "+p.loaded+" / "+p.total+" ).")
      progressbar.style.width = "#{ p.loaded / p.total * 100 }%"
  )

u = bkcore.Utils.getURLParameter

defaultControls = if bkcore.Utils.isTouchDevice() then 1 else 0

s = [
  ['controlType', labels.controlType.values, defaultControls, defaultControls,
    labels.controlType.prefix]
  ['quality', labels.quality.values, 3, 3, labels.quality.prefix]
  ['hud', labels.hud.values, 1, 1, labels.hud.prefix]
  ['godmode', labels.godmode.values, 0, 1, labels.godmode.prefix]
]

for a in s
  do(a)->
    a[3] = u(a[0]) ? a[2]
    e = $ "s-#{a[0]}"
    # Une valeur hors liste (atteignable par URL) doit afficher un libelle valide.
    f = ->
      label = a[1][a[3]]
      if not label?
        extra = labels[a[0]].extra
        label = extra?[a[3]]
      if not label?
        label = a[1][a[2]]
      e.innerHTML = a[4]+label
    f()
    e.onclick = -> f(a[3] = (a[3]+1)%a[1].length)
$('step-2').onclick = ->
  $('step-2').style.display = 'none'
  $('step-3').style.display = 'block'
  init s[0][3], s[1][3], s[2][3], s[3][3]
$('step-5').onclick = ->
  window.location.reload()
$('s-credits').onclick = ->
  $('step-1').style.display = 'none'
  $('credits').style.display = 'block'
$('credits').onclick = ->
  $('step-1').style.display = 'block'
  $('credits').style.display = 'none'

hasWebGL = ->
  gl = null
  canvas = document.createElement('canvas');
  try
    gl = canvas.getContext("webgl")
  if not gl?
    try
      gl = canvas.getContext("experimental-webgl")
  return gl?

if not hasWebGL()
  getWebGL = $('start')
  getWebGL.innerHTML = 'WebGL requis : le jeu ne peut pas demarrer'
  getWebGL.onclick = ->
    window.location.href = 'http://get.webgl.org/'
else
  $('start').onclick = ->
    $('step-1').style.display = 'none'
    $('step-2').style.display = 'block'
    $('step-2').style.backgroundImage = "url(css/help-#{s[0][3]}.png)"
