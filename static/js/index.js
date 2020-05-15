'use strict';

google.charts.load('current', {packages: ['corechart']});

// python-like
let zip = (...rows) => [...rows[0]].map((_,c) => rows.map(row => row[c]));

// simple factorial function
function factorial(num) {
    var rval=1;
    for (var i = 2; i <= num; i++)
        rval = rval * i;
    return rval;
}

// chi-sqeare table
var criticalValues = {
  1:  3.841,
  2:  5.991,
  3:  7.815,
  4:  9.488,
  5:  11.070,
  6:  12.592,
  7:  14.067,
  8:  15.507,
  9:  16.919,
  10: 18.301,
  11: 19.657,
  12: 21.026,
  13: 22.362,
  14: 23.658,
  15: 24.996,
  16: 26.269,
  17: 27.587,
  18: 28.869,
  19: 30.144,
  20: 31.410
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

class DB {
  constructor() {
    this.seed = getRandomInt(1000000);
    console.log('Random seed is: ' + this.seed);
  }

  // badass PRNG
  next() {
    this.seed = (this.seed * 1103515245 + 12345) % 2147483647;
    return this.seed;
  }
}

var db = new DB();

class Simulator {
  constructor() {
    this.probs      = [];
    this.labels     = [];
    this.events     = [];
    this.exactProbs = [];

    this.counter = 0;
    this.N = 0;

    this.E = 0;
    this.D = 0;
    this.exactE = 0;
    this.exactD = 0;
    this.chi = 0;
  }

  addRow() {
    if (this.counter <= 10) {
      // самая убогая генерация HTML, которую вы сегодня увидите
      let elem = `<tr id="tr${this.counter}">
                      <th scope="row">${this.counter + 1}</th>
                      <td><input type="text" class="form-control" id="name${this.counter}" /></td>
                      <td><input type="text" class="form-control" id="prob${this.counter}" /></td>
                  </tr>`;

      $('#table-body').append(elem);
      this.counter++;
    }
  }

  deleteRow() {
    if (this.counter > 0) {
      $('#tr' + (--this.counter)).remove();
    }
  }

  start() {
    if (this.counter > 0) {
      this._cleanup();

      this._extractProbs();
      this._extractLabels();
      this._extractN();

      this._calculateDistributionParameters();

      this._simulateEvents();
      this._calculateExactProbs();
      this._calculateExactDistributionParameters();

      this._appendProbsToLabels();
      this._setResultValues();
      this._drawResult();
    }
  }

  _simulateEvents() {
    for (let i = 0; i < this.counter; i++) this.events.push(0);

    for (let j = 0; j < this.N; j++) {
      let acc = 0;
      let rand = (db.next() % 10000) / 10000;

      for (let i = 0; i < this.counter; i++) {
        acc += this.probs[i];
        if (rand <= acc) {
          this.events[i]++;
          break;
        }
      }
    }
  }

  _calculateExactProbs() {
    for (let i = 0; i < this.events.length; i++) {
      this.exactProbs.push(this.events[i]/this.N);
    }
  }

  _calculateDistributionParameters() {
    for (let i = 0; i < this.probs.length; i++) {
      this.E += this.labels[i] * this.probs[i];
    }

    for (let i = 0; i < this.probs.length; i++) {
      this.D += this.probs[i] * (this.labels[i] - this.E) * (this.labels[i] - this.E);
    }
  }

  _calculateExactDistributionParameters() {
    for (let i = 0; i < this.exactProbs.length; i++) {
      this.exactE += this.labels[i] * this.exactProbs[i];
    }

    for (let i = 0; i < this.exactProbs.length; i++) {
      this.exactD += this.exactProbs[i] * (this.labels[i] - this.exactE) * (this.labels[i] - this.exactE);
    }

    for (let i = 0; i < this.probs.length; i++) {
      this.chi += (this.events[i] * this.events[i])/(this.N * this.probs[i]);
    }
    this.chi -= this.N;
  }

  _appendProbsToLabels() {
    for (let i = 0; i < this.exactProbs.length; i++) {
      // appending to the end of the label
      let proba = " (" + (this.exactProbs[i]*100).toFixed(1)  + "%)";
      this.labels[i] += proba;
    }
  }

  _setResultValues() {
    let dD = Math.abs(this.exactD - this.D) / Math.abs(this.D);
    let dE = Math.abs(this.exactE - this.E) / Math.abs(this.E);

    let text = "";
    if (this.chi < criticalValues[this.counter]) {
      text = this.chi.toFixed(3) + " &lt; " + criticalValues[this.counter] + ' (\<span class="text-success">не отклоняется</span>)';
    } else {
      text = this.chi.toFixed(3) + " &gt; " + criticalValues[this.counter] + ' (<span class="text-danger">не принимается</span>)';
    }

    $("#average").html("Матожидание: " + this.E.toFixed(3) + " (погрешность " + (dE*100).toFixed(1) + "%)");
    $("#variance").html("Дисперсия: " + this.D.toFixed(3) + " (погрешность " + (dD*100).toFixed(1) + "%)");
    $("#chi-square").html("Хи-квадрат: " + text);
  }

  _drawResult() {
    let data = new google.visualization.DataTable();

    data.addColumn('string', 'Событие');
    data.addColumn('number', 'Кол-во');

    data.addRows(zip(this.labels, this.events));

    let options = {'title':'Визуализация'};
    let chart = new google.visualization.ColumnChart(document.getElementById('graph'));

    chart.draw(data, options);
  }

  _extractProbs() {
    for (let i = 0; i < this.counter; i++) {
      let v = parseFloat(document.getElementById('prob' + i).value);
      if (isNaN(v)) {
        this._panic("Invalid probability input");
      }
      this.probs.push(v);
    }

    var sum = this.probs.reduce((x, y) => x + y);

    if (sum.toFixed(6) != 1) {
      this._panic("Sum of probs != 1");
    }
  }

  _extractLabels() {
    for (let i = 0; i < this.counter; i++) {
      let v = parseFloat(document.getElementById('name' + i).value);
      if (isNaN(v)) {
        this._panic("Value for row "  + (i+1) + " must be float");
      }
      this.labels.push(v);
    }
  }

  _extractN() {
    this.N = parseInt(document.getElementById('attempts-number').value);
    if (isNaN(this.N)) {
      this._panic("Invalid number of iterations");
    }
  }

  _panic(msg) {
    alert(msg);
    this._cleanup();
  }

  _cleanup() {
    this.probs      = [];
    this.exactProbs = [];
    this.labels     = [];
    this.events     = [];

    this.N = 0;
    this.E = 0;
    this.D = 0;
    this.chi = 0;
    this.exactE = 0;
    this.exactD = 0;
  }
}

class Puasson {
  constructor() {
    this.L = 0;
    this.N = 0;
    this.range = 0;
    this.results = [];
    this.puassonResults = [];

    this.E = 0;
    this.D = 0;
    this.chi = 0;
    this.exactE = 0;
    this.exactD = 0;
    this.labels = [];
  }

  start() {
    this._cleanup();
    this._extractParameters();

    this._simulateEvents();
    this._simulateRealPuasson();

    this._calculateDistributionParameters();
    this._calculateExactDistributionParameters();

    this._setResultValues();
    this._drawResult();
  }

  _simulateRealPuasson() {
    for (let m = 0; m < this.range; m++) {
      let v = (Math.pow((this.L), m)/factorial(m))*Math.pow(2.7182818284, -this.L);
      this.puassonResults.push(v);
    }
  }

  _simulateEvents() {
    // init array
    for (let i = 0; i < this.range; i++) {
      this.results.push(0);
    }

    for (let i = 0; i < this.N; i++) {
      let s = 0;
      let m = -1;

      while (s > -this.L) {
        m++;
        let rand = (db.next() % 10000) / 10000;
        s += Math.log(rand);
      }
      try {
        this.results[m]++;
      } catch (e) {
        console.log("Out of range");
        continue;
      }
    }

    for (let i = 0; i < this.results.length; i++) {
      this.results[i] /= this.N;
    }
  }

  _calculateDistributionParameters() {
    for (let i = 0; i < this.puassonResults.length; i++) {
      this.E += this.labels[i] * this.puassonResults[i];
    }

    for (let i = 0; i < this.puassonResults.length; i++) {
      this.D += this.puassonResults[i] * (this.labels[i] - this.E) * (this.labels[i] - this.E);
    }
  }

  _calculateExactDistributionParameters() {
    for (let i = 0; i < this.results.length; i++) {
      this.exactE += this.labels[i] * this.results[i];
    }

    for (let i = 0; i < this.results.length; i++) {
      this.exactD += this.results[i] * (this.labels[i] - this.exactE) * (this.labels[i] - this.exactE);
    }

    for (let i = 0; i < this.results.length; i++) {
      this.chi += (this.results[i]*this.results[i]*this.N*this.N)/(this.N*this.puassonResults[i]);
    }
    this.chi -= this.N;
  }

  _setResultValues() {
    let dD = Math.abs(this.exactD - this.D) / Math.abs(this.D);
    let dE = Math.abs(this.exactE - this.E) / Math.abs(this.E);

    let text = "";
    if (this.chi < criticalValues[this.range]) {
      text = this.chi.toFixed(3) + " &lt; " + criticalValues[this.range] + ' (\<span class="text-success">не отклоняется</span>)';
    } else {
      text = this.chi.toFixed(3) + " &gt; " + criticalValues[this.range] + ' (<span class="text-danger">не принимается</span>)';
    }

    $("#puasson-average").html("Матожидание: " + this.E.toFixed(3) + " (погрешность " + (dE*100).toFixed(1) + "%)");
    $("#puasson-variance").html("Дисперсия: " + this.D.toFixed(3) + " (погрешность " + (dD*100).toFixed(1) + "%)");
    $("#puasson-chi-square").html("Хи-квадрат: " + text);
  }

  _drawResult() {
    let data = new google.visualization.DataTable();

    data.addColumn('string', 'Событие');
    data.addColumn('number', 'Реальная вероятность');
    data.addColumn('number', 'Ожидаемая вероятность');

    for (let i = 0; i < this.range; i++) this.labels[i] = this.labels[i].toString();

    data.addRows(zip(this.labels, this.results, this.puassonResults));

    let options = {'title':'Визуализация'};
    let chart = new google.visualization.LineChart(document.getElementById('puasson-graph'));

    chart.draw(data, options);
  }

  _extractParameters() {
    this.L = parseFloat(document.getElementById('puasson-intensity').value);
    this.N = parseInt(document.getElementById('puasson-attempts-number').value);
    this.range = parseInt(document.getElementById('puasson-range').value);

    if (isNaN(this.L)) {
      this._panic("Invalid intensity parameter");
    }
    if (isNaN(this.N)) {
      this._panic("Invalid number of attempts");
    }
    if (isNaN(this.range)) {
      this._panic("Invalid range");
    }
    if (this.range > 20) {
      alert("Range should be <= 20 to count chi-square correctly")
    }

    for (let i = 0; i < this.range; i++) this.labels.push((i));
  }

  _panic(msg) {
    alert(msg);
    this._cleanup();
  }

  _cleanup() {
    this.L = 0;
    this.N = 0;
    this.range = 0;
    this.results = [];
    this.puassonResults = [];

    this.E = 0;
    this.D = 0;
    this.chi = 0;
    this.exactE = 0;
    this.exactD = 0;
    this.labels = [];
  }
}

class Gauss {
  constructor() {
    this.E = 0;
    this.D = 0;
    this.N = 0;
    this.rangeLen = 0;

    this.X = [];
    this.Y = [];
  }

  start() {
    this._cleanup();
    this._extractParameters();

    this._simulateEvents();
    this._drawResult();
  }

  _simulateEvents() {
    for (let i = 0; i < this.N; i++) {
      let rand = (Math.random() - 0.5)*this.rangeLen;
      let e = (1/(Math.sqrt(2*Math.PI)))*Math.pow(Math.E, (-rand*rand)/2);
      e = this.E + this.D*e;
      this.Y.push(e);
      this.X.push(rand);
    }
  }

  _extractParameters() {
    this.E = parseFloat(document.getElementById('gauss-average').value);
    this.D = parseInt(document.getElementById('gauss-variance').value);
    this.N = parseInt(document.getElementById('gauss-n').value);
    this.rangeLen = parseInt(document.getElementById('gauss-range-len').value);

    if (isNaN(this.E)) {
      this._panic("Invalid average parameter");
    }
    if (isNaN(this.D)) {
      this._panic("Invalid variance");
    }
    if (isNaN(this.N)) {
      this._panic("Invalid number of attempts");
    }
    if (isNaN(this.rangeLen)) {
      this._panic("Invalid range");
    }
  }

  _drawResult() {
    let data = new google.visualization.DataTable();

    data.addColumn('number', 'X');
    data.addColumn('number', 'Y');

    data.addRows(zip(this.X, this.Y));

    let options = {'title':'Визуализация'};
    let chart = new google.visualization.ScatterChart(document.getElementById('gauss-graph'));

    chart.draw(data, options);
  }

  _panic(msg) {
    alert(msg);
    this._cleanup();
  }

  _cleanup() {
    this.E = 0;
    this.D = 0;
    this.N = 0;
    this.rangeLen = 0;

    this.X = [];
    this.Y = [];
  }
}

function main() {
    $('#attempts-number').val(100);

    $('#puasson-range').val(20);
    $('#puasson-attempts-number').val(100);
    $('#puasson-intensity').val(2);

    $('#gauss-range-len').val(10);
    $('#gauss-average').val(0);
    $('#gauss-variance').val(1);
    $('#gauss-n').val(100);

    let sim = new Simulator();

    $('#add-row').click(() => {sim.addRow()});
    $('#delete-row').click(() => {sim.deleteRow()});

    $('#start').click(() => {sim.start()});

    let puasson = new Puasson();

    $('#puasson-start').click(() => puasson.start());

    let gauss = new Gauss();

    $('#gauss-start').click(() => gauss.start());
}


document.addEventListener("DOMContentLoaded", () => {
    main()
});
