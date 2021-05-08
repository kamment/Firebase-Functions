const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();


function add(accumulator, a) {
    return accumulator + a;
}

exports.newUserSignUp = functions.auth.user().onCreate((user) => {
 // Función para setear información en BD a la creación de un usuario
  db.collection("Users").doc(user.uid).set({
    createdAt: new Date(user.metadata.creationTime),
    followers: [],
    follows: [],
    interestCategories: [],
    numReviews: 0,
    userName: "",
    userPhoto: "https://i.pinimg.com/564x/f3/45/48/f34548d81392154fc4de602b96abbbe6.jpg",
    email: user.email,
    rankUser: "Bronze",
  });
});

exports.UpdateUpponReview = functions.firestore.document('Reviews/{id}').onCreate(async (snap, context) => {
    var data=snap.data()
    const placeid=data.placeid;
  const dataPlace= await db.collection("Places").doc(placeid).get()
  const numReviewsPlace= dataPlace.data().numReviews



  const dataUser= await db.collection("Users").doc(data.userid).get()
  const numReviewsUser= dataUser.data().numReviews

  console.log(numReviewsPlace,numReviewsPlace)
  db.collection("Users").doc(data.userid).update({
    numReviews: numReviewsUser +1,
  });

  const reviewsdata=await db.collection("Reviews").where("placeid", "==", placeid).get()
  const scores=reviewsdata.docs.map((review)=>{return review.data().rank})
  const n=scores.length;
  console.log(scores,n)

  const sum=scores.reduce(add, 0); 

  const avg=sum/n;
  console.log(avg)
  db.collection("Places").doc(placeid).update({
    numReviews: n,
    avgRating: avg,
  });
});

