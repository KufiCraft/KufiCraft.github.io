const $ = document.querySelector.bind(document)

class Kufi {

  isPainting = false
  scrolling = {
    is: false,
    startX: 0,
    scrollLeft: 0,
    startY: 0,
    scrollTop: 0
  }
  svg = $('#kufi')
  tool = 'pen'
  color = 'black'
  old = 'default'
  rect = 10
  hidden = []
  archs = []
  lines = []

  constructor(name, mono, restore = false) {

    this.name = restore ? localStorage.getItem('kq_name') : name.replace(/\s\s+/g, ' ').trim()
    this.mono = restore ? localStorage.getItem('kq_mono') === 'true' : mono

    if (restore) this.svg.innerHTML = localStorage.getItem('kq_data')
    document.title += ` - ${this.name}`
    $('#container').style.display = 'block'
    $('#create').style.display = 'none'
    $('#popup').onclick = e => {
      e.stopPropagation()
      e.target.id === 'popup' && this.popup(false)
    }
    $('#container').scrollTo({
      top: 2000 - innerHeight / 2,
      left: innerWidth / 2 - 2000
    })
    this.mono && this.svg.classList.add('mono')



    $('#toolbar').style.display = 'grid'

    let el, rect, x, y

    this.svg.addEventListener('touchstart', (e) => {
      this.hidden = []
      if (this.tool == 'pen') this.backup()
      this.paint(true)
    }, { passive: true })

    this.svg.addEventListener('mousedown', (e) => {
      e.preventDefault()
      if (window.installer) {
        window.installer.prompt()
        window.installer = 0
      }
      this.hidden = []
      if (!this.isPainting) {
        el = document.elementFromPoint(e.clientX, e.clientY)
        rect = el.getBoundingClientRect()
        x = (e.clientX - rect.left) * 1000 / this.svg.clientWidth
        y = (e.clientY - rect.top) * 1000 / this.svg.clientHeight
        if (el.id == 'kufi' && this.tool == 'pen') {
          this.backup()
          this.drawRect(x, y)
        }
        if (el.parentElement?.id == 'kufi' && this.tool == 'pen') {
          this.backup()
          this.changeColor(el)
        }
        if (el.parentElement?.id == 'kufi' && this.tool == 'eraser') {
          this.hide(el)
        }

        if (this.tool == 'line') {

          if (el.tagName.toLowerCase() == 'rect') {
            this.lines.push({ x: +el.getAttribute('x'), y: +el.getAttribute('y') })
            el.style.fill = 'tomato'
            if (this.lines.length === 2) {
              this.resets(false)
              this.backup()
              this.line()
            }
          } else if (el.id == 'kufi') {
            rect = this.svg.getBoundingClientRect()
            x = (e.clientX - rect.left) * 1000 / this.svg.clientWidth
            y = (e.clientY - rect.top) * 1000 / this.svg.clientHeight
            let temp = this.getCoor(x, y)
            if ((temp.height == this.rect || temp.height == this.rect / 4 * 3) && (temp.width == this.rect || temp.width == this.rect / 4 * 3)) {
              this.drawRect(x, y).setAttribute('style', 'fill:tomato')
              this.lines.push({ x: temp.x, y: temp.y })
              if (this.lines.length === 2) {
                this.resets(false)
                this.backup()
                this.line()
              }
            }
          } else {
            this.info('عذرًا، لا يمكن ربط العقدة بقوس أو عقدة أخرى')
          }
        }
        if (this.tool.includes('arch')) {
          if (el.tagName.toLowerCase() == 'rect' && (el.getAttribute('width') == this.rect || el.getAttribute('width') == this.rect / 4 * 3)) {
            this.backup()
            if (this.archs.length < 1) {
              this.archs.push(el)
              el.setAttribute('style', 'fill:mediumspringgreen')
              this.info('اختر مربعًا آخر من الصف نفسه')
            } else if (el.getAttribute('y') === this.archs[0].getAttribute('y')) {
              this.archs.push(el)
              this.archs[0].removeAttribute('style')
              this.arch(this.archs[0], this.archs[1], this.tool === 'arch2')
              this.archs = []
            } else {
              this.info('رجاءً اختر مربعًا على نفس المحور الأفقي')
            }
          } else {
            this.info('يُحمل القوس على مربعين حصرًا')
          }
        }
        if (this.tool == 'hand') {
          this.scrolling.is = true
          this.scrolling.startX = e.pageX - $('#container').offsetLeft;
          this.scrolling.scrollLeft = $('#container').scrollLeft
          this.scrolling.startY = e.pageY - $('#container').offsetTop;
          this.scrolling.scrollTop = $('#container').scrollTop
        }
      }
      this.paint(true)
    })

    this.svg.addEventListener('touchmove', (e) => {
      el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY)
      rect = el.getBoundingClientRect()
      x = (e.touches[0].clientX - rect.x) * 1000 / rect.width
      y = (e.touches[0].clientY - rect.y) * 1000 / rect.height
      if (el.id == 'kufi' && this.tool == 'pen') this.drawRect(x, y)
      if (el.parentElement?.id == 'kufi' && this.tool == 'pen') this.changeColor(el)
      if (el.parentElement?.id == 'kufi' && this.tool == 'eraser') this.hide(el)
    }, { passive: true })

    this.svg.addEventListener('mousemove', (e) => {
      e.preventDefault()
      if (this.scrolling.is) {
        const x = e.pageX - $('#container').offsetLeft;
        const walkX = (x - this.scrolling.startX);
        $('#container').scrollLeft = this.scrolling.scrollLeft - walkX;
        const y = e.pageY - $('#container').offsetTop;
        const walkY = (y - this.scrolling.startY);
        $('#container').scrollTop = this.scrolling.scrollTop - walkY;
      }
      if (this.isPainting) {
        el = document.elementFromPoint(e.clientX, e.clientY)
        if (el) {
          rect = el.getBoundingClientRect()
          x = (e.clientX - rect.x) * 1000 / rect.width
          y = (e.clientY - rect.y) * 1000 / rect.height
          if (el.id == 'kufi' && this.tool == 'pen') this.drawRect(x, y)
          if (el.parentElement?.id == 'kufi' && this.tool == 'pen') this.changeColor(el)
          if (el.parentElement?.id == 'kufi' && this.tool == 'eraser') this.hide(el)
        }
      }
    })

    this.svg.addEventListener('touchend', (e) => {
      this.paint(false)
      if (this.tool == 'eraser') this.removeHidden()
    }, { passive: true })

    this.svg.addEventListener('mouseup', (e) => {
      e.preventDefault()
      this.paint(false)
      if (this.tool == 'eraser') this.removeHidden()
      this.scrolling.is = false
    })

    window.addEventListener("keydown", (e) => {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.popup(true)
      }
      if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.undo()
      }
      if (e.key === 'h') this.setTool('hand') && e.preventDefault()
      if (e.key === 'p') this.setTool('pen') && e.preventDefault()
      if (e.key === 'e') this.setTool('eraser') && e.preventDefault()
      if (e.key === 'l') this.setTool('line') && e.preventDefault()
      if (e.key === 'c') this.setTool('arch') && e.preventDefault()
    });

  }

  setTool(tool) {
    this.tool = tool
    let container = $('#container')
    if (tool === "hand") {
      container.classList.add('hand')
      this.info('اضغط مرتين على اليد للمحاذاة إلى المنتصف')
    } else {
      container.classList.remove('hand')
      this.resets()
    }
    if (tool == 'line') {
      this.info('حدد نقطتين مختلفتين للوصل بينهما, لا يُستحسن استخدام هذه الأداة لرسم خطوط عمودية أو أفقية إذ لا يمكن رسم قوس عليها كما أنها تعامل كـ كتلة واحدة عند مسحها. تذكر استخدام الضفائر في تصميمك لجعله أكثر جمالية!')
      this.lines = []
    }
    if (tool == 'eraser') this.info('يمكنك الضغط مع السحب لمسح عدة عناصر')
    if (tool == 'pen') this.info(Math.round(-Math.random()))
    if (tool == 'arch' || tool == 'arch2') this.info('اضغط على مربعين على نفس المحور الأفقي لرسم قوس بينهما — لا تقم بالضغط على أماكن فارغة')

    $('[name="tool"]#' + tool).checked = true

    return true
  }
  setColor(color) {
    this.color = color
    if (!$('#arch').checked) {
      this.setTool('pen')
      $('#pen').checked = true
    }
    this.info('تم تغيير اللون')
    return true
  }
  snap() {
    let bbox = this.svg.getBBox()
    if (bbox.width)
      $('#container').scrollTo({
        top: (bbox.y + bbox.height / 2) * this.svg.clientHeight / 1000 - innerHeight / 2,
        left: (bbox.x - 1000 + bbox.width / 2) * (this.svg.clientWidth / 1000) + innerWidth / 2
      })
    else
      $('#container').scrollTo({
        top: 2000 - innerHeight / 2,
        left: innerWidth / 2 - 2000
      })
  }
  zoom(dir = 1) {
    let pos = [$('#container').scrollTop * 1000 / this.svg.clientHeight, $('#container').scrollLeft * 1000 / this.svg.clientWidth]
    let size = this.svg.clientWidth + 400 * dir
    if (size <= 4000 && size >= 800) {
      this.svg.style.setProperty('--size', size + 'px')
      $('#container').scrollTo({
        top: pos[0] * this.svg.clientHeight / 1000,
        left: pos[1] * this.svg.clientWidth / 1000
      })
      this.info(-1)
    } else {
      this.info('عذرًا، يوجد حدود لمعدل التكبير')
    }
  }
  info(text = false) {
    if (text === -1) {
      $('#info').textContent = ''
      return
    }
    let list = [
        'يمكنك دائمًا تغيير لون الكتابة من خلال الضغط على زر الألوان في شريط الأدوات',
        'يمكنك تصدير اللوحة على شكل ملف SVG حيث يمكنك استخدامه في أي برنامج تصميم آخر',
        'تذكر استخدام اختصارات الكيبورد مثل: P لاستخدام القلم، E لاستخدام الممحاة، H لاستخدام اليد، L لرسم خط مستقيم، C لرسم قوس، Ctrl+S للحفظ، Ctrl+Z للتراجع — يمكنك معرفة الاختصار بالوقوف قليلاً فوق الأداة المطلوبة',
        'تم تطوير هذا التطبيق من AbdSattout',
        'يمكنك حفظ اللوحة في التطبيق دون الحاجة لتنزيلها للعودة مرة أخرى واستكمال العمل',
        'نسب الفراغ الافتراضية هي 1:3. يمكنك اختيار الشبكة المنتظمة عند بدء العمل',
        'الخط الكوفي أقدم الخطوط العربية',
        'تذكر أنك تستطيع مسح كل شيء في اللوحة بالضغط مرتين على الممحاة',
        'حافظ على توازن تصميمك، التصميم المتناظر مريح للعين',
        'حاول الالتزام بقواعد الخط الكوفي حتى تكون اللوحة مقروءة',
        'لا تترك فراغات في تصميمك',
        'لا بد من وجود رسالة وراء كل تصميم'
        ]
    $('#info').textContent = text ? '👈 ' + text : '💡 ' + list[Math.round(Math.random() * (list.length - 1))]
    return true
  }
  paint(bool) {
    this.isPainting = bool
    return true
  }
  line() {
    let rect = this.mono ? this.rect : this.rect / 4 * 3
    if (this.lines[0].y > this.lines[1].y)(this.lines.unshift(this.lines[1]), this.lines.pop())
    let el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    el.setAttribute('stroke', this.color)
    el.setAttribute('fill', 'none')
    el.setAttribute('stroke-width', rect)
    el.setAttribute('d', `M ${this.lines[0].x + 0.5 * rect},${this.lines[0].y} l 0,${0.5 * rect} L ${this.lines[1].x + 0.5 * rect},${this.lines[1].y + 0.5 * rect} l 0,${0.5 * rect}`)
    this.svg.insertBefore(el, this.svg.firstChild)
    this.resets()
    this.info(-1)
    return true
  }
  getCoor(_x, _y) {
    let x,
      y,
      width,
      height
    if (this.mono) {
      x = _x - _x % this.rect
      y = _y - _y % this.rect
      width = height = this.rect
    } else {
      let one = this.rect / 4
      let three = this.rect - one
      if (_x % this.rect < three) {
        x = _x - _x % this.rect
        width = three
      } else {
        x = _x - _x % this.rect + three
        width = one
      }
      if (_y % this.rect < three) {
        y = _y - _y % this.rect
        height = three
      } else {
        y = _y - _y % this.rect + three
        height = one
      }
    }
    return { x, y, width, height }
  }
  drawRect(_x, _y) {
    let el = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    let { x, y, width, height } = this.getCoor(_x, _y)
    el.setAttribute('x', x)
    el.setAttribute('y', y)
    el.setAttribute('width', width)
    el.setAttribute('height', height)
    el.setAttribute('fill', this.color)
    this.svg.appendChild(el)
    return el
  }
  changeColor(el) {
    el.setAttribute('fill', this.color)
    return true
  }
  hide(el) {
    if (el.getAttribute('stroke'))
      el.setAttribute('style', 'stroke:lightpink')
    else
      el.setAttribute('style', 'fill:lightpink')
    this.hidden.push(el)
    return true
  }
  removeHidden() {
    if (this.hidden.length > 0) this.backup()
    this.hidden.forEach(el => el.remove())
    this.info(-1)
    return true
  }
  empty() {
    this.svg.textContent = ''
    this.info('تم إعادة ضبط اللوحة')
    return true
  }
  arch(el1, el2, bool = false) {
    let x1, x2, r, path
    let y = +el1.getAttribute('y')
    if (+el1.getAttribute('x') < +el2.getAttribute('x')) {
      x1 = +el1.getAttribute('x')
      x2 = +el2.getAttribute('x')
    } else {
      x1 = +el2.getAttribute('x')
      x2 = +el1.getAttribute('x')
    }

    if (this.mono && x1 !== x2) {
      r = (x2 - x1 + this.rect) / 2
      path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', `M ${x1},${bool ? y + this.rect : y} a ${r},${r} 0 1 ${bool ? '0' : '1'} ${r * 2},0 h -${this.rect} a ${r - this.rect},${r - this.rect} 0 1 ${bool ? '1' : '0'} -${r * 2 - this.rect * 2},0 z`)
      path.setAttribute('fill', this.color)
      this.info(-1)
      let search = this.svg.querySelector(`[d='${path.getAttribute('d')}']`)
      if (search) {
        this.info('يوجد بالفعل قوس بين هذه النقاط')
        search.remove()
      }
      this.svg.appendChild(path)
    } else if (x1 !== x2) {
      r = (x2 - x1 + this.rect / 4 * 3) / 2
      path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', `M ${x1},${bool ? y + this.rect / 4 * 3 : y} a ${r},${r} 0 1 ${bool ? '0' : '1'} ${r * 2},0 h -${this.rect / 4 * 3} a ${r - this.rect / 4 * 3},${r - this.rect / 4 * 3} 0 1 ${bool ? '1' : '0'} -${r * 2 - this.rect / 4 * 3 * 2},0 z`)
      path.setAttribute('fill', this.color)
      this.info(-1)
      let search = this.svg.querySelector(`[d='${path.getAttribute('d')}']`)
      if (search) {
        this.info('يوجد بالفعل قوس بين هذه النقاط')
        search.remove()
      }
      this.svg.appendChild(path)
    } else this.info('الرجاء اختيار نقطتين مختلفتين')
    return true
  }
  resets(empty = true) {
    document.querySelectorAll('svg *[style]').forEach(el => {
      el.style.fill == 'tomato' ? el.remove() : el.removeAttribute('style')
    })
    this.archs = []
    if (empty) this.lines = []
    return true
  }
  save() {
    localStorage.setItem('kq_name', this.name)
    localStorage.setItem('kq_mono', this.mono)
    localStorage.setItem('kq_data', this.svg.innerHTML)
    this.info('تم الحفظ في ذاكرة التطبيق')
    return true
  }
  undo() {
    if (this.old !== 'default') this.svg.innerHTML = this.old
    this.info('تذكر أن التراجع مرة واحدة')
    this.resets()
  }
  backup() {
    this.old = this.svg.innerHTML
    return true
  }
  popup(bool) {
    if (bool) {
      $('#popup').style.display = 'block'
    } else {
      $('#popup').style.display = 'none'
    }
    return true
  }
  async export (type) {
    switch (type) {
      case 'pdf': {
        let pdf = window.open('')
        let bbox = this.svg.getBBox();
        let viewBox = [bbox.x, bbox.y, bbox.width, bbox.height].join(" ");
        pdf.document.write(`<html><head><title>${this.name}</title>`)
        pdf.document.write('</head><body>')
        pdf.document.write(`<svg xmlns="http://www.w3.org/2000/svg" width="${this.svg.style.width}" height="${this.svg.style.height}" viewBox="${viewBox}">${this.svg.innerHTML}</svg>`)
        pdf.document.write('<style>svg{width:360px;height: 360px;}</style>')
        pdf.document.write('</body></html>')
        pdf.document.close();
        pdf.print()
        pdf.onfocus = () => {
          setTimeout(() => {
            pdf.close()
          }, 500)
        }
        this.info('قد لا يعمل التصدير إلى PDF في بعض الأجهزة')
        break
      }
      case 'png': {
        let $a = document.createElement('a')
        $a.href = await convertSVGtoImg()
        $a.setAttribute('download', this.name.replace(/\s/g, '-') + '.png');
        if (document.createEvent) {
          let event = document.createEvent('MouseEvents');
          event.initEvent('click', true, true);
          $a.dispatchEvent(event);
        } else {
          $a.click();
        }
        this.info(-1)
        break
      }
      default: {
        let $a = document.createElement('a');
        let bbox = this.svg.getBBox()
        $a.setAttribute('href', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${bbox.width}" height="${bbox.height}" viewBox="${bbox.x},${bbox.y},${bbox.width},${bbox.height}">${this.svg.innerHTML}</svg>`));
        $a.setAttribute('download', this.name.replace(/\s/g, '-') + '.svg');
        if (document.createEvent) {
          let event = document.createEvent('MouseEvents');
          event.initEvent('click', true, true);
          $a.dispatchEvent(event);
        } else {
          $a.click();
        }
        this.info(-1)
      }
    }
    return true
  }
}

let board
const create = (restore = false) => {
  let name = $('#name').value
  let mono = $('#mono').checked
  board = new Kufi(name, mono, restore)
  window.onerror = err => board.info(err)
  if (restore) {
    board.info('تم استعادة اللوحة من ذاكرة التطبيق')
    board.snap()
  }
}

onload = () => {
  $('.loader').remove()
  $('#create button[disabled]').removeAttribute('disabled')
  if (localStorage.getItem('kq_name') && localStorage.getItem('kq_mono') && localStorage.getItem('kq_data')) {
    $('#restore').removeAttribute('hidden')
    if (location.hash === '#restore') create(true)
  }
}

const loadImage = async url => {
  const $img = document.createElement('img')
  $img.src = url
  return new Promise((resolve, reject) => {
    $img.onload = () => resolve($img)
    $img.onerror = reject
  })
}

const convertSVGtoImg = async e => {
  const $svg = board.svg
  const format = 'png'
  const bbox = board.svg.getBBox()

  const svgAsXML = (new XMLSerializer()).serializeToString($svg)
  const svgData = `data:image/svg+xml,${encodeURIComponent(svgAsXML)}`

  const img = await loadImage(svgData)

  let $canvas = document.createElement('canvas')
  $canvas.width = $svg.clientWidth
  $canvas.height = $svg.clientHeight
  let ctx = $canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, $svg.clientWidth, $svg.clientHeight)
  let imageData = ctx.getImageData(bbox.x * $svg.clientWidth / 1000, bbox.y * $svg.clientHeight / 1000, bbox.width * $svg.clientWidth / 1000, bbox.height * $svg.clientHeight / 1000)
  $canvas = document.createElement('canvas')
  $canvas.width = bbox.width * $svg.clientWidth / 1000
  $canvas.height = bbox.height * $svg.clientHeight / 1000
  ctx = $canvas.getContext("2d")
  ctx.putImageData(imageData, 0, 0)

  const dataURL = await $canvas.toDataURL(`image/${format}`, 1.0)


  return dataURL
}