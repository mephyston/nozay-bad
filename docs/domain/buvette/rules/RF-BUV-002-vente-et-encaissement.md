# RF-BUV-002 : Vente et encaissement

## 1. Description et Objectif Métier

Le bénévole compose un panier et encaisse depuis un seul écran. Le montant part directement vers l'application SumUp : il n'y a rien à ressaisir, et une erreur de paiement ne laisse ni client débité à tort ni vente perdue.

---

## 2. Domaine Fonctionnel

- **Domaine** : buvette
- **Agrégat / Entité clé** : Vente, Réservation
- **Statut** : Draft

---

## 3. Définition de la Règle Métier

**Le panier.** Il contient des articles, une recharge, ou les deux. Une recharge désigne sa carte par le scan de son QR code. Une vente n'existe que dans une session de caisse ouverte (RF-BUV-003).

**Moyens de paiement.** Espèces, carte buvette ou CB par l'application SumUp. La carte buvette peut être complétée par des espèces ou par la CB. Les espèces et la CB ne se combinent pas entre elles.

**Une carte qui couvre tout valide au scan.** Si le solde couvre le panier, la vente est payée dès que le QR code est lu. Sinon, la caisse affiche le reste à régler en espèces ou en CB.

**Part payable par carte.** Le scan débite le plus petit de ces deux montants : le solde disponible et le montant des articles. Une recharge ne se paie jamais avec une carte buvette.

**Le solde ne devient jamais négatif.** La réservation et le contrôle du solde sont une seule opération atomique.

**Ordre d'un paiement mixte.** La part carte est réservée d'abord, le complément est encaissé ensuite. La réservation devient un débit quand tout est réglé. Si le complément échoue ou si le bénévole abandonne, elle est libérée.

**Une vente en cours ne s'efface pas toute seule.** Sa réservation tient jusqu'à ce qu'un bénévole de la session encaisse ou abandonne. La caisse liste ces ventes, et une session ne se clôture pas tant qu'il en reste.

**CB.** Le serveur enregistre une tentative avec son propre identifiant, puis la caisse ouvre l'application SumUp avec le montant et cet identifiant. L'application encaisse, en Tap to Pay ou avec un lecteur.

**Seule l'API SumUp fait foi.** Le retour de l'application passe par le navigateur et peut être forgé : il déclenche une vérification, il ne valide rien. Le serveur relit la transaction par son identifiant et ne marque la vente payée que si son statut est réussi, avec le montant et la devise attendus. Le code de transaction est conservé.

**Le retour n'est pas garanti.** Sur iPhone, il s'ouvre dans le navigateur par défaut du téléphone, quel que soit celui d'où le paiement est parti, et il peut ne jamais arriver. La caisse s'utilise donc dans le navigateur par défaut, sans installation. Il arrive dans un nouvel onglet : la page de retour lance la vérification, ne montre aucune donnée de vente, puis tente de fermer cet onglet pour ramener à la caisse. À sa réouverture, la caisse relit l'état de la vente sur le serveur, et une vérification périodique reprend les tentatives restées sans réponse.

**Une nouvelle tentative attend la fin de la précédente.** Tant que la précédente n'est pas établie comme échouée, la vente reste « à vérifier » et rien ne repart. Une tentative est considérée comme non aboutie si l'API lui donne un statut d'échec, ou si l'API ne la connaît toujours pas 2 minutes après son envoi. Le bénévole n'attend donc pas après une annulation. Un nouvel essai porte toujours un nouvel identifiant, car SumUp refuse celui d'une tentative déjà faite.

**Annulation et refus reviennent en échec.** Sur iPhone, les deux reviennent en `smp-status=failed` et l'API les marque en échec. La caisse affiche « Paiement non abouti », sans en donner la cause.

**Abandonner reste toujours possible,** même si SumUp ne répond pas : une panne ne coince ni la vente ni la clôture. La caisse tente d'abord une vérification, puis libère la réservation. La tentative reste relue ensuite.

**Paiement tardif ou en double.** Si une tentative réussit alors que la vente est annulée ou déjà payée, la transaction est signalée à la clôture pour être remboursée par SumUp. Elle n'est jamais rattachée à une autre vente.

**Application SumUp absente.** Si le lien n'ouvre rien, la tentative reste inconnue de SumUp et le bénévole choisit un autre moyen de paiement.

**Annulation d'une vente réglée en CB.** La carte est recréditée, et la caisse rappelle de rembourser la part CB dans SumUp.

**Espèces.** Le bénévole confirme les espèces reçues avant de valider : une carte trop courte ne valide jamais une vente à elle seule. Appuyer sur « Montant exact » ou sur un billet vaut confirmation, et la caisse affiche la monnaie à rendre.

**Double validation.** Une vente porte un identifiant généré par la caisse : un double appui ou une nouvelle tentative réseau ne l'encaisse et ne la débite qu'une fois.

**Rembourser une vente.** Tant que la session est ouverte, un bénévole retrouve la vente dans la liste des transactions et la rembourse : la carte est recréditée et les espèces sont rendues. La part CB se rembourse dans SumUp, ce que la caisse rappelle. Une recharge déjà consommée ne se rembourse pas ainsi. Après la clôture, seul un responsable corrige, avec un motif et une écriture de régularisation.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Vente et encaissement

  Scénario: Paiement complet par carte
    Étant donné une carte de 10 € et un panier d'articles de 4 €
    Quand le bénévole scanne le QR code du client
    Alors la vente est payée et le solde passe à 6 €

  Scénario: Une carte trop courte ne valide pas sans les espèces
    Étant donné une carte de 3 € et un panier d'articles de 4 €
    Quand le bénévole scanne la carte sans confirmer les espèces reçues
    Alors la vente ne peut pas être validée
    Quand il confirme avoir reçu 1 €
    Alors la vente est payée et le solde passe à 0 €

  Scénario: Rembourser une vente depuis les transactions
    Étant donné une vente de 4 € payée en espèces dans la session ouverte
    Quand le bénévole la rembourse depuis la liste des transactions
    Alors la vente est marquée remboursée et la caisse affiche 4 € à rendre

  Scénario: Carte complétée par la CB
    Étant donné une carte de 8 € et un panier d'articles de 12 €
    Quand le bénévole scanne le QR code
    Alors 8 € sont réservés et l'application SumUp s'ouvre pour 4 €
    Quand l'API SumUp confirme une transaction réussie de 4 €
    Alors la vente est payée et le solde passe à 0 €

  Scénario: Un retour forgé ne valide rien
    Étant donné une tentative en attente
    Quand l'adresse de retour est ouverte avec "smp-status=success"
    Et que l'API SumUp ne connaît pas de transaction réussie pour cette tentative
    Alors la vente n'est pas payée

  Scénario: Le montant encaissé ne correspond pas
    Étant donné une tentative de 4 €
    Quand l'API SumUp rend une transaction réussie de 0,40 €
    Alors la vente n'est pas payée
    Et l'anomalie est signalée au bénévole

  Scénario: Le retour rouvre un autre navigateur
    Étant donné un paiement réussi dans l'application SumUp
    Quand le bénévole revient à la caisse installée sans passer par l'adresse de retour
    Alors la caisse relit l'état sur le serveur et affiche la vente payée

  Scénario: Paiement arrivé après l'abandon
    Étant donné une vente annulée après une tentative sans réponse
    Quand la vérification périodique trouve cette tentative réussie
    Alors la transaction est signalée à rembourser
    Et la vente reste annulée

  Scénario: Le complément échoue
    Étant donné 8 € réservés sur une carte et un complément CB de 4 €
    Quand SumUp refuse le paiement et que le bénévole abandonne
    Alors la réservation est libérée et le solde reste à 8 €

  Scénario: La recharge ne se paie pas avec une carte
    Étant donné une carte de 10 € et un panier avec un café à 1 € et une recharge de 20 €
    Quand le bénévole scanne le QR code pour payer
    Alors seul 1 € est réservé sur la carte
    Et les 20 € restants sont à régler en espèces ou en CB

  Scénario: Deux caisses scannent la même carte
    Étant donné une carte de 10 € et deux paniers de 8 €
    Quand les deux caisses scannent la carte en même temps
    Alors une seule réservation de 8 € passe en entier
    Et l'autre vente ne peut réserver que les 2 € restants

  Scénario: Résultat SumUp perdu
    Étant donné une tentative envoyée à l'application SumUp
    Quand la caisse ne reçoit aucun retour
    Alors la vente reste en cours et est marquée "à vérifier"
    Et aucune nouvelle tentative ne peut partir avant la vérification

  Scénario: Une nouvelle tentative a son propre identifiant
    Étant donné une tentative établie comme échouée
    Quand le bénévole relance la CB
    Alors une nouvelle tentative part avec un nouvel identifiant

  Scénario: Application SumUp absente
    Étant donné une caisse sur un téléphone sans l'application SumUp
    Quand le lien n'ouvre rien et que SumUp ne connaît pas la tentative après 2 minutes
    Alors le bénévole peut choisir un autre moyen de paiement
```
