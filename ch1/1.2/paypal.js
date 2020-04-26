const EthCrypto = require('eth-crypto');
const Client = require('./client.js');

// Our naive implementation of a centralized payment processor
class Paypal extends Client {
  constructor() {
    super();
    // the state of the network (accounts and balances)
    this.state = {
      [this.wallet.address]: {
        balance: 1000000,
      },
    };
    // the history of transactions
    this.txHistory = [];
  }

  // Checks that the sender of a transaction is the same as the signer
  checkTxSignature(tx) {
    // get the signature from the transaction
    const { sig, contents } = tx;
    const { from } = contents;
    const signature = this.verify(sig, this.toHash(contents), from);  
    // if the signature is invalid print an error to the console and return false
    if(!signature) {
      console.log('Invalid signature');
      return false;
    }
    return true;
  }

  // Checks if the user's address is already in the state, and if not, adds the user's address to the state
  checkUserAddress(tx) {
    const { contents:{ to, from } } = tx;
    // check if the receiver is in the state
    // if the receiver is not in the state, create an account for them
    if(!(to in this.state)) {
      this.state[to] = { balance:0 };
    }
    // check if the sender is in the state
    // if the sender is not in the state, create an account for them
    if(!(from in this.state)) {
      this.state[from] = { balance:0 };
    }
    // once the checks on both accounts pass (they're both in the state), return true
    return true;
  }

  // Checks the transaction type and ensures that the transaction is valid based on that type
  checkTxType(tx) {
    const { type, from, to, amount } = tx.contents;
    // if the transaction type is 'mint'
    if(type === 'mint') {
    // check that the sender is PayPal
      if(from !== this.wallet.address) {
        console.log('Invalid minter, need to register with CBK');
        return false;
      }
      return true;
    }
    // if the transaction type is 'check' & print the sender's balance to the
    // console
    // return false so that the stateTransitionFunction does not process the tx
    if(type === 'check') {
      console.log(`Your balance is ${this.state[from].balance}`);
      return false;
    }
    // if the transaction type is 'send'
    // check that the transaction amount is positive and the sender has an account balance greater than or equal to the transaction amount
    // if a check fails, print an error to the console stating why and return false
    // if the check passes, return true
    if(type === 'send') {
      if((this.state[from].balance - amount) < 0) {
        console.log('Not enough money');
        return false;
      }
      console.log('new state after spending \n', this.state);
    }
    return true;
  }

  // Checks if a transaction is valid, adds it to the transaction history, and updates the state of accounts and balances
  checkTx(tx) {
    // check that the transaction signature is valid
    // check that the transaction sender and receiver are in the state
    // check that the transaction type is valid
    // if all checks pass return true
    // if any checks fail return false
    if(this.checkTxSignature(tx)) {
      if(this.checkUserAddress(tx)) {
        if(this.checkTxType(tx)) {
          return true
        }
      }
    }
    return false;
  }

  // Updates account balances according to a transaction and adds the transaction to the history
  applyTx(tx) {
    const { contents:{ from, to, amount, type } } = tx;
    if(type === 'mint') {
      this.state[to].balance += amount;
      this.state[this.wallet.address].balance -= amount;
    } else {
      // decrease the balance of the transaction sender/signer
      this.state[from].balance -= amount;
      // increase the balance of the transaction receiver
      this.state[to].balance += amount;
    }
    // add the transaction to the transaction history
    this.txHistory.push(tx);
    // return true once the transaction is processed
    return true;
  }

  // Process a transaction
  processTx(tx) {
    // check the transaction is valid
    if(this.checkTx(tx)) {
    // apply the transaction to Paypal's state
      this.applyTx(tx);
    }
  }
}

module.exports = Paypal;
