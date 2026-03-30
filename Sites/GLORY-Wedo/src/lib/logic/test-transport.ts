import { getTransportRecommendation } from './transport-logic';

function testTransportLogic() {
  console.log('--- 4 人接送機 (應該不須额外行李車) ---');
  console.log(getTransportRecommendation(4, true));

  console.log('--- 8 人接送機 (應該要行李車) ---');
  console.log(getTransportRecommendation(8, true));

  console.log('--- 15 人接送機 (Coaster) ---');
  console.log(getTransportRecommendation(15, true));

  console.log('--- 25 人接送機 (LargeBus) ---');
  console.log(getTransportRecommendation(25, true));
}

testTransportLogic();
