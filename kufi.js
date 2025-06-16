const $ = document.querySelector.bind(document)

/**
 * Represents a Kufi art board, handling drawing, tools, and interactions.
 */
class Kufi {

  isPainting = false
  /**
   * @property {object} scrolling - Manages scrolling state.
   * @property {boolean} scrolling.is - True if currently scrolling.
   * @property {number} scrolling.startX - X coordinate where scrolling started.
   * @property {number} scrolling.scrollLeft - Initial scrollLeft position.
   * @property {number} scrolling.startY - Y coordinate where scrolling started.
   * @property {number} scrolling.scrollTop - Initial scrollTop position.
   */
  scrolling = {
    is: false,
    startX: 0,
    scrollLeft: 0,
    startY: 0,
    scrollTop: 0
  }
  /**
   * @property {HTMLElement} svg - The SVG element for drawing.
   */
  svg = $('#kufi')
  /**
   * @property {string} tool - The currently selected tool (e.g., 'pen', 'eraser').
   */
  tool = 'pen'
  /**
   * @property {string} color - The current drawing color.
   */
  color = 'black'
  /**
   * @property {string} old - Stores the previous SVG innerHTML for undo functionality.
   */
  old = 'default'
  /**
   * @property {number} rect - The base size of a drawing rectangle/grid unit.
   */
  rect = 10
  /**
   * @property {string} gridType - The type of grid currently in use ('square' or 'circular').
   */
  gridType = 'square'
  /**
   * @property {Array<HTMLElement>} hidden - Array of elements temporarily hidden/marked for deletion.
   */
  hidden = []
  /**
   * @property {Array<HTMLElement>} archs - Stores elements selected for drawing arches.
   */
  archs = []
  /**
   * @property {Array<object>} lines - Stores coordinates for drawing lines.
   */
  lines = []

  /**
   * Creates an instance of Kufi.
   * @param {string} name - The name of the Kufi board.
   * @param {boolean} mono - Whether the board is in monochrome mode.
   * @param {boolean} restore - Whether to restore a saved board from local storage.
   * @param {string} [gridType='square'] - The type of grid to use ('square' or 'circular').
   */
  constructor(name, mono, restore = false, gridType = 'square') {

    this.name = restore ? localStorage.getItem('kq_name') : name.replace(/\s\s+/g, ' ').trim()
    this.mono = restore ? localStorage.getItem('kq_mono') === 'true' : mono
    this.size = restore ? localStorage.getItem('kq_size') : 3200
    if (restore) this.svg.innerHTML = localStorage.getItem('kq_data')
    this.svg.style.setProperty('--size', this.size + 'px')
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

    // Remove existing grid type classes to prevent conflicts
    this.svg.classList.remove('mono', 'square', 'circular');

    this.gridType = gridType;
    this.svg.classList.add(this.gridType); // Add new grid type class
    this.mono && this.svg.classList.add('mono'); // Add mono class if applicable

    $('#toolbar').style.display = 'grid'

    let el, rect, x, y

    this.svg.addEventListener('touchstart', (e) => {
      this.hidden = []
      if (this.tool == 'pen') this.backup()
      this.paint(true)
    }, { passive: true })

    this.svg.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      if (!this.isPainting) {
        el = document.elementFromPoint(e.clientX, e.clientY)

        if (el.parentElement?.id == 'kufi') {
          this.hide(el)
          this.removeHidden()
        }
      }
    })

    this.svg.addEventListener('mousedown', (e) => {
      e.preventDefault()
      if (window.installer) {
        window.installer.prompt()
        window.installer = 0
      }
      this.hidden = []
      if (!this.isPainting) {
        // Calculate accurate SVG coordinates
        let pt = this.svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        let svgP = pt.matrixTransform(this.svg.getScreenCTM().inverse());

        el = document.elementFromPoint(e.clientX, e.clientY)
        // Use svgP.x and svgP.y for drawing instead of previous calculation
        let x = svgP.x;
        let y = svgP.y;

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

          if (el.tagName.toLowerCase() === (this.gridType === 'square' ? 'rect' : 'path')) {
            if (this.gridType === 'square') {
              this.lines.push({ x: +el.getAttribute('x'), y: +el.getAttribute('y') })
            } else {
              const { innerRadius, outerRadius, startAngle, endAngle } = el.dataset;
              this.lines.push({ el, innerRadius: +innerRadius, outerRadius: +outerRadius, startAngle: +startAngle, endAngle: +endAngle });
            }
            el.style.fill = 'tomato'
            if (this.lines.length === 2) {
              this.resets(false)
              this.backup()
              this.line()
            }
          } else if (el.id == 'kufi') {
            // Use the already transformed svgP.x and svgP.y directly.
            let temp = this.getCoor(x, y);
            if (this.gridType === 'square') {
              if ((temp.height == this.rect || temp.height == this.rect / 4 * 3) && (temp.width == this.rect || temp.width == this.rect / 4 * 3)) {
                this.drawRect(x, y).setAttribute('style', 'fill:tomato')
                this.lines.push({ x: temp.x, y: temp.y })
                if (this.lines.length === 2) {
                  this.resets(false)
                  this.backup()
                  this.line()
                }
              }
            } else { // Circular grid
              let newEl = this.drawRect(x, y);
              newEl.setAttribute('style', 'fill:tomato');
              this.lines.push({ el: newEl, innerRadius: temp.innerRadius, outerRadius: temp.outerRadius, startAngle: temp.startAngle, endAngle: temp.endAngle });
              if (this.lines.length === 2) {
                this.resets(false);
                this.backup();
                this.line();
              }
            }
          } else {
            this.info('عذرًا، لا يمكن ربط العقدة بقوس أو عقدة أخرى')
          }
        }
        if (this.tool.includes('arch')) {
          if (el.tagName.toLowerCase() === (this.gridType === 'square' ? 'rect' : 'path')) {
            this.backup()
            if (this.archs.length < 1) {
              this.archs.push(el)
              el.setAttribute('style', 'fill:mediumspringgreen')
              this.info(this.gridType === 'square' ? 'اختر مربعًا آخر من الصف نفسه' : 'اختر قطعة دائرية أخرى');
            } else if (this.gridType === 'square' && el.getAttribute('y') === this.archs[0].getAttribute('y')) {
              this.archs.push(el)
              this.archs[0].removeAttribute('style')
              this.arch(this.archs[0], this.archs[1], this.tool === 'arch2')
              this.archs = []
            } else if (this.gridType === 'circular' && this.archs.length === 1) { // Allow any second path for circular
              this.archs.push(el);
              this.archs[0].removeAttribute('style');
              this.arch(this.archs[0], this.archs[1], this.tool === 'arch2');
              this.archs = [];
            } else {
              this.info(this.gridType === 'square' ? 'رجاءً اختر مربعًا على نفس المحور الأفقي' : 'يُحمل القوس على قطعتين دائريتين حصرًا');
            }
          } else {
            this.info(this.gridType === 'square' ? 'يُحمل القوس على مربعين حصرًا' : 'يُحمل القوس على قطعتين دائريتين حصرًا');
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
      // Calculate accurate SVG coordinates for touch
      let pt = this.svg.createSVGPoint();
      pt.x = e.touches[0].clientX;
      pt.y = e.touches[0].clientY;
      let svgP = pt.matrixTransform(this.svg.getScreenCTM().inverse());

      el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY)
      // Use svgP.x and svgP.y for drawing instead of previous calculation
      let x = svgP.x;
      let y = svgP.y;

      if (el.id == 'kufi' && this.tool == 'pen') this.drawRect(x, y)
      // Remove client coordinate recalculation for pen/eraser on existing elements
      if (el.parentElement?.id == 'kufi' && this.tool == 'pen' && el.tagName.toLowerCase() === (this.gridType === 'square' ? 'rect' : 'path')) this.changeColor(el)
      if (el.parentElement?.id == 'kufi' && this.tool == 'eraser' && el.tagName.toLowerCase() === (this.gridType === 'square' ? 'rect' : 'path')) this.hide(el)
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
        // Calculate accurate SVG coordinates for mousemove
        let pt = this.svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        let svgP = pt.matrixTransform(this.svg.getScreenCTM().inverse());

        el = document.elementFromPoint(e.clientX, e.clientY)
        if (el) {
          // Use svgP.x and svgP.y for drawing instead of previous calculation
          let x = svgP.x;
          let y = svgP.y;
          if (el.id == 'kufi' && this.tool == 'pen') this.drawRect(x, y)
          // Remove client coordinate recalculation for pen/eraser on existing elements
          if (el.parentElement?.id == 'kufi' && this.tool == 'pen' && el.tagName.toLowerCase() === (this.gridType === 'square' ? 'rect' : 'path')) this.changeColor(el)
          if (el.parentElement?.id == 'kufi' && this.tool == 'eraser' && el.tagName.toLowerCase() === (this.gridType === 'square' ? 'rect' : 'path')) this.hide(el)
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

  /**
   * Sets the current active tool and updates the UI accordingly.
   * @param {string} tool - The tool to set (e.g., 'pen', 'eraser', 'hand', 'line', 'arch', 'arch2').
   * @returns {boolean} - Always returns true.
   */
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
    if (tool == 'eraser') this.info('يمكنك الضغط مع السحب لمسح عدة عناصر')
    if (tool == 'pen') this.info(Math.round(-Math.random()))
    if (this.gridType == 'circular') return

    if (tool == 'line') {
      this.info(this.gridType === 'square' ? 'حدد نقطتين مختلفتين للوصل بينهما, لا يُستحسن استخدام هذه الأداة لرسم خطوط عمودية أو أفقية إذ لا يمكن رسم قوس عليها كما أنها تعامل كـ كتلة واحدة عند مسحها. تذكر استخدام الضفائر في تصميمك لجعله أكثر جمالية!' : 'حدد قطعتين دائريتين مختلفتين للوصل بينهما.')
      this.lines = []
    }
    if (tool == 'arch' || tool == 'arch2') this.info(this.gridType === 'square' ? 'اضغط على مربعين على نفس المحور الأفقي لرسم قوس بينهما — لا تقم بالضغط على أماكن فارغة' : 'اضغط على قطعتين دائريتين لرسم قوس بينهما — لا تقم بالضغط على أماكن فارغة')

    $('[name="tool"]#' + tool).checked = true

    return true
  }
  /**
   * Sets the current drawing color.
   * @param {string} color - The color to set.
   * @returns {boolean} - Always returns true.
   */
  setColor(color) {
    this.color = color
    if (!$('#arch').checked) {
      this.setTool('pen')
      $('#pen').checked = true
    }
    this.info('تم تغيير اللون')
    return true
  }
  /**
   * Snaps the view to center on the drawn content within the SVG, or to a default center if no content exists.
   */
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
  /**
   * Zooms the SVG canvas in or out.
   * @param {number} [dir=1] - The direction of zoom, 1 for zoom in, -1 for zoom out.
   */
  zoom(dir = 1) {
    let pos = [$('#container').scrollTop * 1000 / this.svg.clientHeight, $('#container').scrollLeft * 1000 / this.svg.clientWidth]
    let size = this.svg.clientWidth + 400 * dir
    if (size <= 4000 && size >= 800) {
      this.size = size
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
  /**
   * Displays informational messages or random tips to the user.
   * @param {string|number} [text=false] - The message to display. If -1, clears the message. If false, displays a random tip.
   * @returns {boolean} - Always returns true.
   */
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
  /**
   * Sets the painting state.
   * @param {boolean} bool - True to enable painting, false to disable.
   * @returns {boolean} - Always returns true.
   */
  paint(bool) {
    this.isPainting = bool
    return true
  }
  /**
   * Draws a line between two selected circular segments.
   * @returns {boolean} - Always returns true.
   */
  line() {
    if (this.gridType === 'square') {
      let rect = this.mono ? this.rect : this.rect / 4 * 3
      if (this.lines[0].y > this.lines[1].y) (this.lines.unshift(this.lines[1]), this.lines.pop())
      let el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      el.setAttribute('stroke', this.color)
      el.setAttribute('fill', 'none')
      el.setAttribute('stroke-width', rect)
      el.setAttribute('d', `M ${this.lines[0].x + 0.5 * rect},${this.lines[0].y} l 0,${0.5 * rect} L ${this.lines[1].x + 0.5 * rect},${this.lines[1].y + 0.5 * rect} l 0,${0.5 * rect}`)
      this.svg.insertBefore(el, this.svg.firstChild)
    } else {
      window.drawCircularLine(this);
    }
    this.resets()
    this.info(-1)
    return true
  }
  /**
   * Calculates the snapped coordinates and dimensions for drawing a rectangle based on the current mode (mono or not).
   * @param {number} _x - The raw X coordinate.
   * @param {number} _y - The raw Y coordinate.
   * @returns {{x: number, y: number, width: number, height: number}} - The snapped coordinates and dimensions.
   */
  getCoor(_x, _y) {
    if (this.gridType === 'square') {
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
    } else { // circular grid
      return window.getCircularCoor(this, _x, _y);
    }
  }
  /**
   * Draws a rectangle on the SVG canvas at the given coordinates.
   * @param {number} _x - The raw X coordinate for the rectangle.
   * @param {number} _y - The raw Y coordinate for the rectangle.
   * @returns {HTMLElement} - The created SVG rect element.
   */
  drawRect(_x, _y) {
    if (this.gridType === 'square') {
      let el = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      let { x, y, width, height } = this.getCoor(_x, _y)
      el.setAttribute('x', x)
      el.setAttribute('y', y)
      el.setAttribute('width', width)
      el.setAttribute('height', height)
      el.setAttribute('fill', this.color)
      this.svg.appendChild(el)
      return el
    } else { // circular grid
      return window.drawCircularRect(this, _x, _y);
    }
  }
  /**
   * Changes the fill color of a given SVG element.
   * @param {HTMLElement} el - The SVG element whose color is to be changed.
   * @returns {boolean} - Always returns true.
   */
  changeColor(el) {
    el.setAttribute('fill', this.color)
    return true
  }
  /**
   * Hides an element by changing its style and adds it to the hidden array for potential removal.
   * @param {HTMLElement} el - The element to hide.
   * @returns {boolean} - Always returns true.
   */
  hide(el) {
    if (el.getAttribute('stroke'))
      el.setAttribute('style', 'stroke:lightpink')
    else
      el.setAttribute('style', 'fill:lightpink')
    this.hidden.push(el)
    return true
  }
  /**
   * Removes all elements that were previously marked as hidden.
   * @returns {boolean} - Always returns true.
   */
  removeHidden() {
    if (this.hidden.length > 0) this.backup()
    this.hidden.forEach(el => el.remove())
    this.info(-1)
    return true
  }
  /**
   * Clears all content from the SVG canvas.
   * @returns {boolean} - Always returns true.
   */
  empty() {
    this.svg.textContent = ''
    this.info('تم إعادة ضبط اللوحة')
    return true
  }
  /**
   * Draws an arch between two selected rectangle elements.
   * @param {HTMLElement} el1 - The first rectangle element.
   * @param {HTMLElement} el2 - The second rectangle element.
   * @param {boolean} [bool=false] - Determines the direction/orientation of the arch.
   * @returns {boolean} - Always returns true.
   */
  arch(el1, el2, bool = false) {
    if (this.gridType === 'square') {
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
    } else { // circular grid
      window.drawCircularArch(this, el1, el2, bool);
    }
    return true
  }
  /**
   * Resets the state of selected elements (lines and arches) and clears temporary styling.
   * @param {boolean} [empty=true] - If true, also clears the `lines` array.
   * @returns {boolean} - Always returns true.
   */
  resets(empty = true) {
    document.querySelectorAll('svg *[style]').forEach(el => {
      el.style.fill == 'tomato' ? el.remove() : el.removeAttribute('style')
    })
    this.archs = []
    if (empty) this.lines = []
    return true
  }
  /**
   * Saves the current Kufi board state (name, monochrome mode, size, and SVG content) to local storage.
   * @returns {boolean} - Always returns true.
   */
  save() {
    localStorage.setItem('kq_name', this.name)
    localStorage.setItem('kq_mono', this.mono)
    localStorage.setItem('kq_size', this.size)
    localStorage.setItem('kq_data', this.svg.innerHTML)
    this.info('تم الحفظ في ذاكرة التطبيق')
    return true
  }
  /**
   * Undoes the last major drawing action by restoring the SVG content from a backup.
   */
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
  /**
   * Exports the current SVG content to a specified file type (PDF, PNG, or SVG).
   * @param {string} type - The desired export type ('pdf', 'png', or 'svg').
   * @returns {boolean} - Always returns true.
   */
  async export(type) {
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
        try {
          const blob = await (await fetch(await convertSVGtoImg())).blob();
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: this.name.replace(/\s/g, '-') + '.png',
            types: [{
              description: 'PNG Image',
              accept: {'image/png': ['.png']},
            }],
          });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          this.info(-1);
        } catch (err) {
          if (err.name !== 'AbortError') {
            this.info('حدث خطأ أثناء حفظ الملف');
          }
        }
        break;
      }
      default: {
        try {
          const bbox = this.svg.getBBox();
          const svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${bbox.width}" height="${bbox.height}" viewBox="${bbox.x},${bbox.y},${bbox.width},${bbox.height}">${this.svg.innerHTML}</svg>`;
          const blob = new Blob([svgContent], { type: 'image/svg+xml' });
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: this.name.replace(/\s/g, '-') + '.svg',
            types: [{
              description: 'SVG Image',
              accept: {'image/svg+xml': ['.svg']},
            }],
          });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          this.info(-1);
        } catch (err) {
          if (err.name !== 'AbortError') {
            this.info('حدث خطأ أثناء حفظ الملف');
          }
        }
      }
    }
    return true
  }
}

let board
/**
 * Initializes a new Kufi board or restores an existing one from local storage.
 * @param {boolean} [restore=false] - Whether to restore a saved board.
 */
const create = (restore = false) => {
  let name = $('#name').value
  let mono = $('#mono').checked

  let gridType = $('[name="gridType"]:checked').value
  if (gridType === 'square') {
    gridType = 'square'
  } else if (gridType === 'circular') {
    gridType = 'circular'
    setTimeout(() => {
      document.getElementById('kufi').scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      })
      let disables = ['arch', 'arch2', 'line']
      disables.forEach(el => {
        document.getElementById(el)?.parentElement?.removeAttribute('onclick')
        document.getElementById(el)?.setAttribute('disabled', 'disabled')
      })
    }, 100);
  } else {
    gridType = 'square'
  }

  board = new Kufi(name, mono, restore, gridType)
  window.onerror = err => board.info(err)
  if (restore) {
    board.info('تم استعادة اللوحة من ذاكرة التطبيق')
    board.snap()
  }
}

/**
 * Initializes the application when the window loads.
 */
onload = () => {
  $('.loader').remove()
  $('#create button[disabled]').removeAttribute('disabled')
  if (localStorage.getItem('kq_name') && localStorage.getItem('kq_mono') && localStorage.getItem('kq_data')) {
    $('#restore').removeAttribute('hidden')
    if (location.hash === '#restore') create(true)
  }
}

/**
 * Loads an image from a given URL.
 * @param {string} url - The URL of the image to load.
 * @returns {Promise<HTMLImageElement>} - A promise that resolves with the loaded image element.
 */
const loadImage = async url => {
  const $img = document.createElement('img')
  $img.src = url
  return new Promise((resolve, reject) => {
    $img.onload = () => resolve($img)
    $img.onerror = reject
  })
}

/**
 * Converts the current SVG content of the Kufi board to a PNG image Data URL.
 * @returns {Promise<string>} - A promise that resolves with the Data URL of the converted PNG image.
 */
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

