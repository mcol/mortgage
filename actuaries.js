// present value of an annuity-immediate
function a_ni(rate, nPeriods) {
    return (1 - Math.pow(1 + rate, -nPeriods)) / rate;
}

// future value of an annuity-immediate
function s_ni(rate, nPeriods) {
    return (Math.pow(1 + rate, nPeriods) - 1) / rate;
}

// compute monthly payment
function pmt(rate, nPeriods, presentValue) {
    return presentValue / a_ni(rate, nPeriods);
}

// principal repayed up to currentPeriod
function cumprinc(payment, rate, currentPeriod, presentValue) {
    return (payment - presentValue * rate) * s_ni(rate, currentPeriod);
}

// principal to be repaid up to currentPeriod
function remprinc(payment, rate, currentPeriod, presentValue) {
    return presentValue - cumprinc(payment, rate, currentPeriod, presentValue);
}

////////////////////////////////

Number.prototype.toCurrency = function() {
    if (!isFinite(this)) return this;
    var self = this.toMoney();
    return parseInt(self).toLocaleString() + "." + self.toFixed(2).slice(-2);
}

Number.prototype.toMoney = function() {
    return Math.round(this) / 100;
}

function setCurrency(currency) {
    return function(amount) {
        return currency + " " + amount.toCurrency();
    }
}

var Mortgage = function() {
    this._amount = 0;
    this._rate = [];
    this._period = [];
    this._payment = [];
    this._overpayment = 0;
};

Mortgage.prototype = {

    amount: function(value) {
        if (!arguments.length) return this._amount;
        this._amount = value * 100;
        return this;
    },

    years: function(value) {
        if (!arguments.length) return this._periods / 12;
        this._periods = value * 12;
        this._period[0] = value * 12;
        return this;
    },

    rate: function(value, year) {
        if (!arguments.length) return this._rate[0] * 12 * 100;
        if (value <= 0) {
            this._rate = this._rate.slice(0, 1);
            this._period = this._period.slice(0, 1);
            this._period[0] = this._periods;
            this._payment = this._payment.slice(0, 1);
            return this;
        }
        if (arguments.length == 1) {
            this._rate[0] = value / 12 / 100;
            return this;
        }
        this._rate[1] = value / 12 / 100;
        this._period[0] = year * 12;
        this._period[1] = this._periods - this._period[0];
        return this;
    },

    overpayment: function(value) {
        if (!arguments.length) return this._overpayment;
        this._overpayment = value * 100;
        return this;
    },

    periods: function() {
        return this._period;
    },

    paymentplan: function() {
        var payment = [];
        payment[0] = pmt(this._rate[0], this._periods, this._amount);
        if (this._period.length > 1) {
            var fv = remprinc(payment[0], this._rate[0], this._period[0], this._amount);
            payment[1] = pmt(this._rate[1], this._period[1], fv);
        }
        return payment;
    },

    payment: function() {
        this._payment[0] = pmt(this._rate[0], this._periods, this._amount) + this._overpayment;
        if (this._period.length > 1) {
            var fv = remprinc(this._payment[0], this._rate[0], this._period[0], this._amount);
            this._payment[1] = pmt(this._rate[1], this._period[1], fv) + this._overpayment;
        }
        return this._payment;
    },

    computeRepayment: function(currentperiod) {
        var principal, origprincipal;
        var origplan = this.paymentplan();
        if (currentperiod <= this._period[0]) {
            principal = cumprinc(this._payment[0], this._rate[0], currentperiod, this._amount);
            origprincipal = cumprinc(origplan[0], this._rate[0], currentperiod, this._amount);
        } else {
            var fv = remprinc(this._payment[0], this._rate[0], this._period[0], this._amount);
            var origfv = remprinc(origplan[0], this._rate[0], this._period[0], this._amount);
            var pd = currentperiod - this._period[0];
            principal = cumprinc(this._payment[1], this._rate[1], pd, fv);
            principal += this._amount - fv;
            origprincipal = cumprinc(origplan[1], this._rate[1], pd, origfv);
            origprincipal += this._amount - origfv;
        }
        principal = Math.min(principal, this._amount);
        return {
            'principal': principal,
            'origprincipal': origprincipal,
            'extra': this._overpayment * currentperiod,
            'remaining': this._amount - principal
        }
    },

    actualperiods: function() {
        function countPeriods(rate, payment, amount) {
            var num = Math.log(1 - amount / payment * rate);
            var den = Math.log(1 + rate);
            return Math.ceil((-num / den).toFixed(2));
        }
        if (this._period.length == 1)
            return countPeriods(this._rate[0], this._payment[0], this._amount);
        var fv = remprinc(this._payment[0], this._rate[0], this._period[0], this._amount);
        return this._period[0] + countPeriods(this._rate[1], this._payment[1], fv);
    }

};

function plotRepayment(element, repayment) {
    var data = [{width: mortgage.amount(), colour: "lightgrey"},
                {width: repayment.principal, colour: "gold"},
                {width: repayment.origprincipal, colour: "limegreen"}];

    var chart = d3.select(element);

    var mar = 20;
    var width = parseInt(chart.style("width"));
    var height = parseInt(chart.style("height"));
    var xScale = d3.scale.linear()
        .domain([0, mortgage.amount()])
        .range([mar, width - 2 * mar]);

    chart.select("svg").remove();
    var svg = chart.append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.selectAll(".barchart").data(data).enter()
        .append("rect")
        .attr("x", xScale(0))
        .attr("y", 0.5)
        .attr("width", function(d) { return xScale(d.width) - mar; })
        .attr("height", height - mar - 0.5)
        .style("fill", function(d) { return d.colour; })
        .style("stroke", "black")
        .style("stroke-width", 1);

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom")
        .tickFormat(function(d) { return currency(d); })
        .ticks(5)
        .tickSubdivide(1);

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + (height - mar)  + ")")
        .call(xAxis);
}
