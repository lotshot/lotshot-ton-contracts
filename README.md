# Lotshot Smart Contracts

Репозиторий содержит смарт‑контракты на FunC и скрипты для запуска лотереи Lotshot в сети TON.

## Установка
1. `npm install`
2. Скопируйте `.env.example` в `.env` и заполните параметры:
   - `ADMIN_ADDRESS` – кошелёк администратора лотереи;
   - `TOKEN_ADDRESS` – jetton, используемый для оплаты билетов;
   - `TICKET_PRICE` – стоимость билета в jetton;

## Деплой
1. Настройте `lotteryConfig` в `scripts/deployJet.ts` и выберите `deployJet` для развертывания лотереи.

В `deployJet.ts` также доступны функции `withdraw()` и `finishRound(winner)`.

## Участие
Игрок отправляет jetton `transfer` на кошелёк лотереи с суммой `TICKET_PRICE`. При наличии реферала его адрес (267 бит) помещается в payload. Переплата возвращается, а указанная часть билета перечисляется рефереру.

## Механика лотереи
1. После получения платежа генерируется случайное число `x` от 0 до 11999.
2. При `x == 0` контракт уведомляет администратора о потенциальном джекпоте. Админ вызывает `finishRound(address)` и игрок получает `JACKPOT_PRIZE` (10 000 jetton).
3. Иначе сравниваются диапазоны и лимиты выигрышей:
   - `x < 4` и `major < 3` – **Major** (1 800 jetton)
   - `x < 14` и `high < 10` – **High** (700 jetton)
   - `x < 64` и `mid < 50` – **Mid** (180 jetton)
   - `x < 214` и `low_mid < 150` – **Low Mid** (50 jetton)
   - `x < 514` и `low < 300` – **Low** (25 jetton)
   - `x < 1714` и `mini < 1200` – **Mini** (10 jetton)
   - иначе игрок остаётся без приза.
4. После выдачи призов соответствующие счётчики увеличиваются, а jetton переводится игроку.
5. На контракте должно оставаться не менее 0.05 TON и достаточный запас jetton для будущих выплат.
6. При отправке билета в `forward_payload` помещайте свой TON‑кошелёк. В поле `forward_ton_amount` укажите не менее `0.27` TON.

## Пример отправки билета
```tsx
import { beginCell, Address } from '@ton/core';

const forwardPayloadBuilder = beginCell().storeAddress(userWallet); // player wallet
const forwardPayload = forwardPayloadBuilder.endCell();

const payload = beginCell()
  .storeUint(0xf8a7ea5, 32)
  .storeUint(0, 64)
  .storeCoins(BigInt(process.env.TICKET_PRICE!))
  .storeAddress(Address.parse(lotteryWallet))
  .storeAddress(userWallet)
  .storeBit(0)
  .storeCoins(toNano('0.27'))
  .storeRef(forwardPayload)
  .endCell();
```

Отправьте `transfer` с этим payload через ваш кошелёк.
