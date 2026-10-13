(function () {
  const agreements = window.ROTEIROS_DATA && window.ROTEIROS_DATA.agreements;
  if (!Array.isArray(agreements)) return;

  const inss = agreements.find((agreement) => agreement.id === "inss");
  const portabilidade = inss && Array.isArray(inss.products)
    ? inss.products.find((product) => product.id === "portabilidade")
    : null;
  const brb = portabilidade && Array.isArray(portabilidade.banks)
    ? portabilidade.banks.find((bank) => bank.id === "brb")
    : null;
  const saldoMinimo = brb && Array.isArray(brb.sections)
    ? brb.sections.find((section) => section.title === "Valor mínimo do saldo devedor")
    : null;

  if (saldoMinimo) saldoMinimo.items = ["R$ 5.000,00"];
})();
