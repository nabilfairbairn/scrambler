function count_letters(str){
    let outp_map = create_count_map(str);
    for (let i = 0 ; i < str.length ;i++) {
        let k = outp_map.get(str[i]);
        outp_map.set(str[i], k+1);
    }
    return outp_map;
}

let word1 = 'BONES'
let word2 = 'BONEY'

let w1_dict = count_letters(word1);
    let w2_dict = count_letters(word2);
    let net_letters = new Map();
    for (const [key, value] of w1_dict) {
        if (w2_dict.has(key)) {
            let difference = w2_dict.get(key) - value
            net_letters.set(key, difference)
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
    console.log(plus_one == 1 && minus_one == -1)