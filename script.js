function limit(element) {
    var max_chars = 1;
    if(element.value.length > max_chars) {
        element.value = element.value.substr(0, max_chars);
    }
}

function count_letters(str){
    outp_map = create_count_map(str);
    for (let i = 0 ; i < str.length ;i++) {
        let k = outp_map.get(str[i]);
        outp_map.set(str[i], k+1);
    }
    return outp_map;
}
     
    //function create map to count character
function create_count_map(str) {
    // map for storing count values
    let ans = new Map();
    for(let i = 0 ; i < str.length; i++)
    {
      ans.set(str[i], 0);
    }
    return ans;   
}

function one_letter_diff(word1, word2) {
    let w1_dict = count_letters(word1);
    let w2_dict = count_letters(word2);
    console.log(w1_dict)
    console.log(w2_dict)
    let net_letters = new Map();
    for (const [key, value] of w1_dict) {
        if (w2_dict.has(key)) {
            net_letters.set(key, (value - w2_dict.get(key)) )
        } else {
            net_letters.set(key, -value)
        }
    }
    for (const [key, value] of w2_dict) {
        if (!(net_letters.has(key))) {
            net_letters.set(key, value)
        }
    }
    let plus_one = 0
    let minus_one = 0
    for (const [key, value] of net_letters) {
        if (value > 0) {
            plus_one += value
        }
        if (value < 0) {
            minus_one += value
        }
    }
    console.log(net_letters)
    return (plus_one == 1 && minus_one == -1)
}

let word1 = 'sport'
let word2 = 'storm'
let word3 = 'spark'

console.log(one_letter_diff(word1, word2))
console.log(one_letter_diff(word2, word1))
console.log(one_letter_diff(word1, word3))
console.log(one_letter_diff(word3, word2))

window.onload = function() {
  var input_id_answer = {}
  var input_id = 0
  var input_id_prefix = "user_input_"
  var words = ["TOUCH", "T_U__", "CO___"];
  var answers = ["TOUCH", "TOUGH", "COUGH"]

  var openModalButtons = document.getElementById('modalbutton')
  var closeModalButtons = document.getElementById('closemodalbutton')
  var overlay = document.getElementById('overlay')

  var modal = document.getElementById('modal')

  function openModal() {
    if (modal == null) {
      console.log('Couldnt find modal?')
      return
    }
    modal.classList.add('open')
    overlay.classList.add('open')
  }

  function closeModal() {
    if (modal == null) {
      console.log('Couldnt find modal?')
      return
    }
    modal.classList.remove('open')
    overlay.classList.remove('open')
  }

  openModalButtons.onclick = openModal 
  overlay.onclick = closeModal 
  closeModalButtons.onclick = closeModal 

  document.getElementById("answerBtn").onclick = function() {
    var printing = ''
    var actual_answer = ''
    var curr_input_id = 0

    var w;
    for (w = 0; w < words.length; w++) {
      var w_word = words[w]
      var l;
      for (l = 0; l < w_word.length; l++) {
        var l_letter = w_word[l]
        if (l_letter === '_') {
          var input_key = input_id_prefix + curr_input_id.toString()
          var input_value = document.getElementById(input_key).value
          input_value = input_value ? input_value.toUpperCase() : ''
          printing += input_value
          actual_answer += answers[w][l]
          curr_input_id++;
        } else {
          printing += l_letter
          actual_answer += l_letter
        }
      }
      printing += ' -> '
      actual_answer += ' -> '
    }
    var right_wrong = (printing === actual_answer) ? "That's right!" : "Try again.";

    var hiding = document.getElementById("button_response")
    hiding.innerText = right_wrong;
    hiding.style.visibility = "visible";
  }

  function limitText(limitField, limitNum) {
      if (limitField.value.length > limitNum) {
          limitField.value = limitField.value.substring(0, limitNum);
      }
  }


  var rowHolder = document.getElementById("rowHolder")

  var n_words = words.length

  var i;
  for (i = 0; i < n_words; i++) {
    var row = document.createElement("div");
    row.className = "wordRow"

    rowHolder.appendChild(row)
    var rowWord = words[i]

    var j;
    for (j = 0; j < rowWord.length; j++) {
      var letter = rowWord[j]
      if (letter === "_") {
        let input = document.createElement("input")
        input.classList.add("letterInput")
        input.classList.add("letterBox")
        input.onkeydown = function() {limit(input)};
        input.onkeyup = function() {limit(input)};

        input.id = input_id_prefix + input_id.toString();
        input_id_answer[input.id] = answers[i][j]
        input_id++;
        row.appendChild(input)
      } else {
        var letter_holder = document.createElement("div")
        letter_holder.className = "letterBox"
        letter_holder.innerText = letter
        row.appendChild(letter_holder)
      }
    }
  }
}
