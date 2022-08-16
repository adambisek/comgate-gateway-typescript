import { AxiosInstance } from 'axios'
import * as qs from 'qs'

type PlainValueObject = Record<string, string | number>
type ConstructorArgs = { merchantId: number; secret: string }
type CreatePaymentParams = {
  referenceId: string | number
  method?: 'ALL'
  price: number
  label: string
}

export class ComgateConnectionException extends Error {}

export default class ComgateConnection {
  private axios: AxiosInstance

  private isTestEnv = true

  private apiBaseUrl = 'https://payments.comgate.cz'

  private apiVersion = '1.0'

  private merchantId: number // in administration so called "Identifikátor propojení obchodu"

  private secret: string // in administration so called "Heslo"

  private country = 'CZ'

  private currency = 'CZK'

  private language = 'cs'

  public constructor(axios: AxiosInstance, { merchantId, secret }: ConstructorArgs) {
    this.axios = axios
    this.merchantId = merchantId
    this.secret = secret
  }

  private async callApi(path: string, params: PlainValueObject): Promise<PlainValueObject> {
    return this.axios({
      method: 'post',
      url: `${this.apiBaseUrl}/v${this.apiVersion}/${path}`,
      data: qs.stringify(params),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }).then((res) => {
      const contentType = res.headers['content-type']
      // Comgate returns sometimes text/html with form data :/
      const isResponseFormUrlEncoded =
        contentType.includes('application/x-www-form-urlencoded') || (contentType.includes('text/html') && path === 'cancel')

      if (!isResponseFormUrlEncoded) {
        throw new ComgateConnectionException(`Response is unknown format '${contentType}'.`)
      }
      const body = qs.parse(res.data)
      if (Number.isNaN(body.code)) {
        throw new ComgateConnectionException(`Response code is not a number (body: ${JSON.stringify(body)})`)
      }
      if (body.code !== '0') {
        throw new ComgateConnectionException(`${body.message || body} (code: ${res.data})`)
      }
      return body as PlainValueObject
    })
  }

  private mergeGlobalParams(params: PlainValueObject): PlainValueObject {
    const { secret, isTestEnv, merchantId, country, language, currency } = this
    return {
      secret,
      test: isTestEnv ? 'true' : 'false',
      merchant: merchantId,
      country,
      lang: language,
      curr: currency,
      ...params,
    }
  }

  public async createPayment(params: CreatePaymentParams): Promise<{ transId: string; redirect: string }> {
    const { transId, redirect } = await this.callApi(
      'create',
      this.mergeGlobalParams({
        prepareOnly: 'true',
        ...params,
        refId: params.referenceId,
        method: params.method || 'ALL',
      }),
    )
    return { transId: transId as string, redirect: redirect as string }
  }

  getAvailablePaymentMethods() {
    throw new ComgateConnectionException('Not implemented yet, because gateway returns response in XML format.')
    // return this.callApi('methods', this.mergeGlobalParams({}))
  }

  getPaymentStatus(transId: string) {
    return this.callApi('status', this.mergeGlobalParams({ transId }))
  }

  cancelPayment(transId: string) {
    return this.callApi('cancel', this.mergeGlobalParams({ transId }))
  }

  refund(transId: string, amount: number) {
    return this.callApi('refund', this.mergeGlobalParams({ transId, amount }))
  }
}
