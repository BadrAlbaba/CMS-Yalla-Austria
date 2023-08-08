//expression to select elemn
const selectElement = (s) => document.querySelector(s);

//pen the menu

selectElement('.open').addEventListener('click', () => {
    selectElement('.nav-list').classList.add('active');

});
//close the menu

selectElement('.close').addEventListener('click', () => {
    selectElement('.nav-list').classList.remove('active');
});

// Study in austria animation
var textWrapper = document.querySelector('.ml11 .letters');
textWrapper.innerHTML = textWrapper.textContent.replace(/([^\x00-\x80]|\w)/g, "<span class='letter'>$&</span>");

anime.timeline({loop: true})
  .add({
    targets: '.ml11 .line',
    scaleY: [0,1],
    opacity: [0.5,1],
    easing: "easeOutExpo",
    duration: 700
  })
  .add({
    targets: '.ml11 .line',
    translateX: [0, document.querySelector('.ml11 .letters').getBoundingClientRect().width + 10],
    easing: "easeOutExpo",
    duration: 700,
    delay: 100
  }).add({
    targets: '.ml11 .letter',
    opacity: [0,1],
    easing: "easeOutExpo",
    duration: 600,
    offset: '-=775',
    delay: (el, i) => 34 * (i+1)
  }).add({
    targets: '.ml11',
    opacity: 0,
    duration: 1000,
    easing: "easeOutExpo",
    delay: 1000
  });

  //Changing nav background after scrolling

$(function () {
  $(document).scroll(function () {
      var $nav = $(".header");
      $nav.toggleClass('scrolled', $(this).scrollTop() > $nav.height());
    });
});


var postsTitle;
$.ajax({
  url:"/autocomplete",
  type: "GET",
  success: function(data){
    postsTitle = data
    $("#search").autocomplete({
        source:postsTitle,
        select: function(event,ui){ 
            window.location.href = `http://localhost:3000/posts/${ui.item.value}`;
        }
    });
  }
});
    /*
    admin Page
     */

    let output = document.getElementById('output');
    let buttons = document.getElementsByClassName('tool--btn');
    for (let btn of buttons) {
      btn.addEventListener('click', () => {
        let cmd = btn.dataset['command'];
        if(cmd === 'createlink') {
          let url = prompt("Enter the link here: ", "http:\/\/");
          document.execCommand(cmd, false, url);
        } else {
          document.execCommand(cmd, false, null);
        }
      })
    }
    

// <script>
//   ClassicEditor
//       .create( document.querySelector( '#editor' ) )
//       .catch( error => {
//           console.error( error );
//       } );
// </script>

// ClassicEditor
//     .create( document.querySelector( '#body' ), {
//         toolbar: [ 'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote' ],
//         heading: {
//             options: [
//                 { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
//                 { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
//                 { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' }
//             ]
//         }
//     } )
//     .catch( error => {
//         console.log( error );
//     } );
