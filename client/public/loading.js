(function () {
  function hideLoadingScreen() {
    var root = document.getElementById('root')
    var loading = document.getElementById('loading-screen')
    if (!root || !loading) return
    root.classList.add('ready')
    loading.classList.add('hidden')
    setTimeout(function () { loading.remove() }, 500)
  }

  async function waitForApp() {
    try { await document.fonts.ready } catch (e) {}
    var maxWait = 10000
    var start = Date.now()
    await new Promise(function (resolve) {
      var check = setInterval(function () {
        var root = document.getElementById('root')
        if ((root && root.children.length > 0) || Date.now() - start > maxWait) {
          clearInterval(check)
          setTimeout(resolve, 200)
        }
      }, 50)
    })
    hideLoadingScreen()
  }

  waitForApp()
})()
