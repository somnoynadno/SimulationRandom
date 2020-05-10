'use strict';

google.charts.load('current', {packages: ['corechart']});

// python-like
let zip = (...rows) => [...rows[0]].map((_,c) => rows.map(row => row[c]));

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
  10: 18.301
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

      this._countDistributionParameters();

      this._simulateEvents();
      this._countExactProbs();
      this._countExactDistributionParameters();

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

  _countExactProbs() {
    for (let i = 0; i < this.events.length; i++) {
      this.exactProbs.push(this.events[i]/this.N);
    }
  }

  _countDistributionParameters() {
    for (let i = 0; i < this.probs.length; i++) {
      this.E += this.labels[i] * this.probs[i];
    }

    for (let i = 0; i < this.probs.length; i++) {
      this.D += this.probs[i] * (this.labels[i] - this.E) * (this.labels[i] - this.E);
    }
  }

  _countExactDistributionParameters() {
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

function getMainAnswer() {
  let ans;

  if (db.next() % 2 == 1) {
    ans = "Да";
  }
  else ans = "Нет";

  $("#main-question-answer").html(ans);
}

function main() {
    $('#attempts-number').val(100);
    $('#main-question-button').click(getMainAnswer);

    let sim = new Simulator();

    $('#add-row').click(() => {sim.addRow()});
    $('#delete-row').click(() => {sim.deleteRow()});

    $('#start').click(() => {sim.start()});
}


document.addEventListener("DOMContentLoaded", () => {
    main()
});
