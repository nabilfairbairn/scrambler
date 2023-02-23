function limit(element) {
    var max_chars = 1;
    if(element.value.length > max_chars) {
        element.value = element.value.substr(0, max_chars);
    }
}

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
        var input = document.createElement("input")
        input.classList.add("letterInput")
        input.classList.add("letterBox")
        input.placeholder = "?"
        input.onkeydown = function() {limit(input)};
        input.onkeyup = function() {limit(input)});

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
