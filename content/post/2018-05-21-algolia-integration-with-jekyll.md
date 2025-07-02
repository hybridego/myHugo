---
layout:     post
title:      "Algolia를 사용하여 Gitpage 블로그에 사이트 내 검색 기능 제공"
subtitle:   ""
date:       2018-05-21 11:00:00
author:     "Lionel.J"
image: "/img/2018-05-06-cryptocurrency_week1/bitcoin_header.jpg"
publishDate: 2018-05-21 11:00:00
tags:
    - Jekyll:q
    - Bitcoin
categories: [ Tech ]
URL: "/2018/05/21/algolia-integration-with-jekyll"

---

> 이 일련의 기사는 "비트코인 및 암호화폐 기술" 온라인 강좌의 제 노트입니다.

## 목차
{:.no_toc}

* 목차
{:toc}

## 스크루지 코인 거래
스크루지 코인 프로그래밍 과제는 약간 까다롭습니다. 이 강의의 비디오는 일부 구현 세부 사항을 설명하지 않았습니다. 스크루지 코인에서 사용되는 거래 데이터 구조를 이해하는 데 도움이 되도록 이 다이어그램을 그렸습니다.
![스크루지 코인](/img/2018-5-20-cryptocurrency_week1_scroogecoin/scroogecoin.png)

<!--more-->
모든 거래에는 입력 세트와 출력 세트가 있습니다. 거래의 입력은 이전 거래의 해당 출력을 참조하기 위해 해시 포인터를 사용해야 하며, 소유자가 자신의 코인을 사용하기로 동의했음을 증명해야 하므로 소유자의 개인 키로 서명되어야 합니다.

모든 출력은 수신자의 공개 키와 관련되어 있으며, 이는 수신자의 스크루지 코인 주소입니다.

첫 번째 거래에서 스크루지는 10개의 코인을 생성하여 자신에게 할당했다고 가정합니다. 시스템인 스크루지 코인에는 스크루지가 코인을 생성할 권리가 있다는 내장 규칙이 있으므로 우리는 의심하지 않습니다.

두 번째 거래에서 스크루지는 3.9개의 코인을 앨리스에게, 5.9개의 코인을 밥에게 전송했습니다. 두 출력의 합계가 입력보다 0.2 적은 이유는 거래 수수료가 0.2 코인이었기 때문입니다.

세 번째 거래에서는 두 개의 입력과 하나의 출력이 있었고, 앨리스와 밥은 9.7개의 코인을 마이크에게 전송했으며, 거래 수수료는 0.1 코인이었습니다.

## 미청구 거래 출력 풀
프로그래밍 과제를 수행할 때 주의해야 할 또 다른 점은 미청구 출력(미사용 코인)을 추적하기 위해 UTXOPool이 도입된다는 것입니다. 이를 통해 거래 입력의 해당 출력이 사용 가능한지 여부를 알 수 있습니다.

## TxHandler 자바 코드
```
import java.security.PublicKey;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class TxHandler {
	private UTXOPool utxoPool;

	/**
	 * 현재 UTXOPool(미사용 거래 출력 컬렉션)이 {@code utxoPool}인 공개 원장을 생성합니다.
	 * UTXOPool(UTXOPool uPool) 생성자를 사용하여 utxoPool의 복사본을 만들어야 합니다.
	 */
	public TxHandler(UTXOPool utxoPool) {
		this.utxoPool = new UTXOPool(utxoPool);
	}

	/**
	 * @return 다음 조건이 모두 참이면 true를 반환합니다:
	 *         (1) {@code tx}에 의해 청구된 모든 출력이 현재 UTXO 풀에 있습니다.
	 *         (2) {@code tx}의 각 입력에 대한 서명이 유효합니다.
	 *         (3) {@code tx}에 의해 UTXO가 여러 번 청구되지 않습니다.
	 *         (4) {@code tx}의 모든 출력 값이 음수가 아닙니다.
	 *         (5) {@code tx}의 입력 값 합계가 출력 값 합계보다 크거나 같습니다.
	 *         그렇지 않으면 false를 반환합니다.
	 */
	public boolean isValidTx(Transaction tx) {
		Set<UTXO> claimedUTXO = new HashSet<UTXO>();
		double inputSum = 0;
		double outputSum = 0;

		List<Transaction.Input> inputs = tx.getInputs();
		for (int i = 0; i < inputs.size(); i++) {
			Transaction.Input input = inputs.get(i);

			if (!isConsumedCoinAvailable(input)) {
				return false;
			}

			if (!verifySignatureOfConsumeCoin(tx, i, input)) {
				return false;
			}

			if (isCoinConsumedMultipleTimes(claimedUTXO, input)) {
				return false;
			}

			UTXO utxo = new UTXO(input.prevTxHash, input.outputIndex);
			Transaction.Output correspondingOutput = utxoPool.getTxOutput(utxo);
			inputSum += correspondingOutput.value;

		}

		List<Transaction.Output> outputs = tx.getOutputs();
		for (int i = 0; i < outputs.size(); i++) {
			Transaction.Output output = outputs.get(i);
			if (output.value <= 0) {
				return false;
			}

			outputSum += output.value;
		}

		// 입력 값과 출력 값이 같아야 합니까? 그렇지 않으면 원장이 불균형해집니다.
		// inputSum과 outputSum의 차이는 거래 수수료입니다.
		if (outputSum > inputSum) {
			return false;
		}

		return true;
	}

	private boolean isCoinConsumedMultipleTimes(Set<UTXO> claimedUTXO, Transaction.Input input) {
		UTXO utxo = new UTXO(input.prevTxHash, input.outputIndex);
		return !claimedUTXO.add(utxo);
	}

	private boolean verifySignatureOfConsumeCoin(Transaction tx, int index, Transaction.Input input) {
		UTXO utxo = new UTXO(input.prevTxHash, input.outputIndex);
		Transaction.Output correspondingOutput = utxoPool.getTxOutput(utxo);
		PublicKey pk = correspondingOutput.address;
		return Crypto.verifySignature(pk, tx.getRawDataToSign(index), input.signature);
	}

	private boolean isConsumedCoinAvailable(Transaction.Input input) {
		UTXO utxo = new UTXO(input.prevTxHash, input.outputIndex);
		return utxoPool.contains(utxo);
	}

	/**
	 * 제안된 거래의 정렬되지 않은 배열을 수신하고, 각 거래의 정확성을 확인하고,
	 * 상호 유효한 승인된 거래 배열을 반환하고,
	 * 현재 UTXO 풀을 적절하게 업데이트하여 각 에포크를 처리합니다.
	 */
	public Transaction[] handleTxs(Transaction[] possibleTxs) {
		List<Transaction> acceptedTx = new ArrayList<Transaction>();
		for (int i = 0; i < possibleTxs.length; i++) {
			Transaction tx = possibleTxs[i];
			if (isValidTx(tx)) {
				acceptedTx.add(tx);

				removeConsumedCoinsFromPool(tx);
				addCreatedCoinsToPool(tx);
			}
		}

		Transaction[] result = new Transaction[acceptedTx.size()];
		acceptedTx.toArray(result);
		return result;
	}

	private void addCreatedCoinsToPool(Transaction tx) {
		List<Transaction.Output> outputs = tx.getOutputs();
		for (int j = 0; j < outputs.size(); j++) {
			Transaction.Output output = outputs.get(j);
			UTXO utxo = new UTXO(tx.getHash(), j);
			utxoPool.addUTXO(utxo, output);
		}
	}

	private void removeConsumedCoinsFromPool(Transaction tx) {
		List<Transaction.Input> inputs = tx.getInputs();
		for (int j = 0; j < inputs.size(); j++) {
			Transaction.Input input = inputs.get(j);
			UTXO utxo = new UTXO(input.prevTxHash, input.outputIndex);
			utxoPool.removeUTXO(utxo);
		}
	}

}
```
## GitHub의 모든 예제 코드
코드를 Maven 프로젝트로 묶었습니다. `mvn test`를 실행하면 예제 코드가 빌드되고 모든 테스트 케이스가 실행됩니다.

[Java로 된 스크루지 코인 예제](https://github.com/zhaohuabing/scroogecoin)
