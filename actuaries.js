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

function setCurrency(currency) {
    return function(amount) {
        return currency + " " + amount.toFixed(2);
    }
}

function clamp(val, min, max) {
    if (isNaN(val) || val == "")
        val = 0;
    if (val < min)
        return min;
    if (val > max)
        return max;
    return val;
}

function computePeriods(amount, totalPayment, monthlyRate) {
    var num = Math.log(1 - amount / totalPayment * monthlyRate);
    var den = Math.log(1 + monthlyRate);
    return Math.ceil((-num / den).toFixed(2));
}

function computePayment(amount, rate, years, overpayment) {
    var monthlyRate = rate / 12 / 100;
    var periods = years * 12;
    var payment = pmt(monthlyRate, periods, amount);
    var actual = computePeriods(amount, payment + overpayment, monthlyRate);
    return {
        'amount': amount,
        'payment': payment,
        'overpayment': overpayment,
        'periods': periods,
        'actualperiods': actual,
        'monthlyRate': monthlyRate
    }
}

function computeRepayment(mortgage, currentperiod) {
    var amount = mortgage.amount;
    var principal = cumprinc(mortgage.payment + mortgage.overpayment,
                             mortgage.monthlyRate, currentperiod, amount);
    principal = Math.min(principal, amount);
    var extra =  mortgage.overpayment * currentperiod;
    return {
        'principal': principal,
        'extra': extra,
        'remaining': amount - principal
    }
}

function initRaphael(element) {
    var el = $(element);
    var width = parseInt(el.css("width"));
    var height = parseInt(el.css("height"));
    var paper = new Raphael(el[0], width, height);
    return {'paper': paper,
            'width': width,
            'height': height};
}

function plotRepayment(raphael, repayment) {
    function drawRect(left, width, hue) {
        width = width * raphael.width;
        var r = raphael.paper.rect(left, 0, width, raphael.height);
        r.attr({fill: Raphael.hsb(hue, .75, 1)});
        return left + width;
    }
    var extraPaymRect = repayment.extra / amount;
    var remainingRect = repayment.remaining / amount;
    var principalRect = 1 - extraPaymRect - remainingRect;
    var left = 0;
    left = drawRect(left, principalRect, 0.4);
    left = drawRect(left, extraPaymRect, 0.1);
    left = drawRect(left, remainingRect, 0.0);
}
