fetch('https://holidays-jp.github.io/api/v1/date.json')
  .then(r => r.json())
  .then(data => console.log(Object.keys(data).slice(0, 5)))
